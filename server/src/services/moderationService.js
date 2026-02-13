const ModerationRule = require('../models/ModerationRule');
const ModerationLog = require('../models/ModerationLog');

/**
 * Moderation Service
 * Système de modération automatique pour messages et avis
 * Mode "masquage" style Leboncoin : on ne bloque pas, on masque les données sensibles
 */
class ModerationService {
  constructor() {
    // Cache des règles actives pour performance
    this.rulesCache = null;
    this.lastCacheUpdate = null;
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Charger les règles actives depuis la DB
   */
  async loadRules() {
    const now = Date.now();

    // Return cache if still valid
    if (this.rulesCache && this.lastCacheUpdate && (now - this.lastCacheUpdate) < this.CACHE_TTL) {
      return this.rulesCache;
    }

    // Fetch active rules from DB
    this.rulesCache = await ModerationRule.find({ enabled: true }).lean();
    this.lastCacheUpdate = now;

    return this.rulesCache;
  }

  /**
   * Invalider le cache (appelé quand règles modifiées)
   */
  invalidateCache() {
    this.rulesCache = null;
    this.lastCacheUpdate = null;
  }

  /**
   * Check content contre toutes les règles actives
   * @param {String} content - Contenu à vérifier
   * @param {String} contentType - 'message' ou 'review'
   * @param {Object} context - Contexte additionnel (userId, etc.)
   * @returns {Object} Résultat de la modération
   */
  async checkContent(content, contentType = 'message', context = {}) {
    if (!content || typeof content !== 'string') {
      return {
        level: 'clean',
        action: 'allow',
        flags: [],
        triggeredRules: [],
        totalScore: 0,
        message: null,
        maskedContent: null,
        warningMessage: null
      };
    }

    const rules = await this.loadRules();
    const triggeredRules = [];
    let totalScore = 0;

    // Filter rules applicable to this content type
    let applicableRules = rules.filter(rule =>
      rule.appliesTo.includes(contentType) || rule.appliesTo.includes('both')
    );

    // Skip external_contact rules when booking is confirmed/paid
    if (context.skipExternalContact) {
      applicableRules = applicableRules.filter(rule => rule.category !== 'external_contact');
    }

    // Check each rule
    for (const rule of applicableRules) {
      const isTriggered = await this.checkRule(content, rule);

      if (isTriggered) {
        triggeredRules.push({
          ruleId: rule._id,
          ruleName: rule.name,
          category: rule.category,
          severity: rule.severity,
          score: rule.score,
          action: rule.action,
          ruleType: rule.type,
          ruleContent: rule.content
        });

        totalScore += rule.score;

        // Update rule stats
        await ModerationRule.findById(rule._id).then(r => r && r.recordTrigger(rule.action));
      }
    }

    // Determine final action based on triggered rules
    let finalAction = 'allow';
    let level = 'clean';
    let message = null;
    let maskedContent = null;
    let warningMessage = null;

    if (triggeredRules.length > 0) {
      const hasMaskable = triggeredRules.some(r =>
        r.action === 'block' || (r.category === 'insult' && r.severity !== 'low')
      );
      const highestSeverity = this.getHighestSeverity(triggeredRules);

      if (hasMaskable) {
        finalAction = 'mask';
        level = 'high';
        maskedContent = this.maskContent(content, triggeredRules);
        warningMessage = this.getWarningMessage(triggeredRules);
      } else {
        finalAction = 'flag';
        level = highestSeverity === 'high' ? 'medium' : 'low';
      }
    }

    // Create moderation log
    if (triggeredRules.length > 0 && context.userId) {
      await this.logModeration({
        contentType,
        userId: context.userId,
        originalContent: content,
        triggeredRules,
        totalScore,
        action: finalAction,
        metadata: context.metadata || {}
      });
    }

    return {
      level,
      action: finalAction,
      flags: [...new Set(triggeredRules.map(r => r.category))],
      triggeredRules,
      totalScore,
      message,
      maskedContent,
      warningMessage
    };
  }

  /**
   * Masquer le contenu sensible (style Leboncoin)
   * Remplace téléphones, emails, insultes par des ***
   */
  maskContent(content, triggeredRules) {
    let masked = content;

    for (const triggered of triggeredRules) {
      switch (triggered.category) {
        case 'external_contact':
          if (triggered.ruleType === 'pattern') {
            masked = this.maskPattern(masked, triggered.ruleContent, triggered.ruleName);
          }
          break;

        case 'insult':
          if (triggered.ruleType === 'keyword') {
            const keyword = triggered.ruleContent;
            const regex = new RegExp(`\\b${this.escapeRegex(keyword)}\\b`, 'gi');
            masked = masked.replace(regex, '*'.repeat(keyword.length));
          }
          break;
      }
    }

    return masked;
  }

  /**
   * Masquer un pattern spécifique selon son type
   */
  maskPattern(content, pattern, ruleName) {
    try {
      const regex = new RegExp(pattern, 'gi');

      // Try direct match first
      if (regex.test(content)) {
        return content.replace(new RegExp(pattern, 'gi'), (match) => {
          return this._maskMatch(match, ruleName);
        });
      }

      // If the pattern matched via collapsed spaces, we need to find and mask
      // the original spaced-out version in the content
      const collapsed = content.replace(/\s+/g, '');
      if (regex.test(collapsed)) {
        // Build a space-tolerant version of the pattern by inserting \s* between chars
        // For emails/phones, mask the whole suspicious segment
        if (ruleName && (ruleName.includes('Email') || ruleName.includes('Phone'))) {
          // Find the region: collapse spaces, find match positions, map back
          return this._maskSpacedPattern(content, pattern, ruleName);
        }
      }

      return content;
    } catch (e) {
      console.error('Error masking pattern:', pattern, e);
      return content;
    }
  }

  /**
   * Mask a direct regex match based on rule type
   */
  _maskMatch(match, ruleName) {
    // Phone numbers: show first 2 + last 2
    if (ruleName && ruleName.includes('Phone')) {
      const digits = match.replace(/[\s.\-()]/g, '');
      if (digits.length >= 4) {
        return digits.slice(0, 2) + '\u2022'.repeat(digits.length - 4) + digits.slice(-2);
      }
      return '\u2022'.repeat(match.length);
    }

    // Emails: t***@***.fr
    if (ruleName && ruleName.includes('Email')) {
      const cleaned = match.replace(/\s+/g, '');
      const atIndex = cleaned.indexOf('@');
      if (atIndex > 0) {
        const ext = cleaned.split('.').pop();
        return cleaned[0] + '***@***.' + ext;
      }
      return '***@***.***';
    }

    // WhatsApp, Facebook, URLs: [lien masqué]
    return '[lien masqué]';
  }

  /**
   * Mask content where the pattern matches a spaced-out version
   * Maps collapsed match positions back to original content
   */
  _maskSpacedPattern(content, pattern, ruleName) {
    const collapsed = content.replace(/\s+/g, '');
    const regex = new RegExp(pattern, 'gi');
    const match = regex.exec(collapsed);
    if (!match) return content;

    // Map collapsed indices back to original content indices
    const startCollapsed = match.index;
    const endCollapsed = match.index + match[0].length;

    let collapsedIdx = 0;
    let origStart = -1;
    let origEnd = -1;

    for (let i = 0; i < content.length; i++) {
      if (content[i] !== ' ' && content[i] !== '\t' && content[i] !== '\n') {
        if (collapsedIdx === startCollapsed && origStart === -1) origStart = i;
        collapsedIdx++;
        if (collapsedIdx === endCollapsed) { origEnd = i + 1; break; }
      }
    }

    if (origStart === -1 || origEnd === -1) return content;

    const originalSegment = content.substring(origStart, origEnd);
    const replacement = this._maskMatch(originalSegment, ruleName);
    return content.substring(0, origStart) + replacement + content.substring(origEnd);
  }

  /**
   * Escape special regex characters in a string
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Generate warning message based on triggered categories
   */
  getWarningMessage(triggeredRules) {
    const categories = [...new Set(triggeredRules.map(r => r.category))];

    const hasInsult = categories.includes('insult');
    const hasExternalContact = categories.includes('external_contact');

    if (hasInsult && hasExternalContact) {
      return 'Ce message a \u00e9t\u00e9 mod\u00e9r\u00e9. Les insultes, le contenu promotionnel et le partage de coordonn\u00e9es personnelles (t\u00e9l\u00e9phone, email, r\u00e9seaux sociaux) sont interdits sur Baytup. Tout manquement peut entra\u00eener des sanctions.';
    }

    if (hasInsult) {
      return 'Ce message a \u00e9t\u00e9 mod\u00e9r\u00e9. Les insultes et le contenu promotionnel sont interdits sur Baytup. Merci de rester respectueux. Tout manquement r\u00e9p\u00e9t\u00e9 peut entra\u00eener des sanctions.';
    }

    if (hasExternalContact) {
      return 'Rappel : Le partage de coordonn\u00e9es personnelles (t\u00e9l\u00e9phone, email, r\u00e9seaux sociaux) et le contenu promotionnel sont interdits avant la r\u00e9servation. Les insultes ne sont pas tol\u00e9r\u00e9es. Utilisez la messagerie Baytup pour communiquer en toute s\u00e9curit\u00e9.';
    }

    return 'Ce message a \u00e9t\u00e9 mod\u00e9r\u00e9 automatiquement. Les insultes, le contenu promotionnel et le partage de coordonn\u00e9es sont interdits sur Baytup.';
  }

  /**
   * Check si un contenu match une r\u00e8gle sp\u00e9cifique
   */
  async checkRule(content, rule) {
    const cleanContent = content.toLowerCase().trim();

    switch (rule.type) {
      case 'keyword':
        return this.checkKeyword(cleanContent, rule.content);

      case 'pattern':
        return this.checkPattern(cleanContent, rule.content);

      case 'behavior':
        return this.checkBehavior(content, rule.content);

      default:
        return false;
    }
  }

  /**
   * Check mot-cl\u00e9 simple
   */
  checkKeyword(content, keyword) {
    const pattern = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'i');
    return pattern.test(content);
  }

  /**
   * Check pattern regex
   * Tests against both original content and a normalized version
   * (spaces stripped) to catch evasion like "poipoi @ oiu . fr"
   */
  checkPattern(content, pattern) {
    try {
      const regex = new RegExp(pattern, 'i');
      // Test original content first
      if (regex.test(content)) return true;
      // Also test with spaces collapsed (catches "p @ o.fr", "0 5 5 5 12 34 56")
      const collapsed = content.replace(/\s+/g, '');
      if (regex.test(collapsed)) return true;
      return false;
    } catch (e) {
      console.error('Invalid regex pattern:', pattern, e);
      return false;
    }
  }

  /**
   * Check comportement suspect (majuscules, r\u00e9p\u00e9titions, etc.)
   */
  checkBehavior(content, behaviorType) {
    switch (behaviorType) {
      case 'excessive_caps':
        // Plus de 70% en majuscules
        const upperCaseRatio = (content.match(/[A-Z]/g) || []).length / content.length;
        return upperCaseRatio > 0.7 && content.length > 10;

      case 'excessive_emoji':
        // Plus de 20% d'emojis
        const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
        const emojiCount = (content.match(emojiRegex) || []).length;
        return emojiCount > content.length * 0.2;

      case 'repeated_chars':
        // Caract\u00e8res r\u00e9p\u00e9t\u00e9s 5+ fois
        return /(.)\1{4,}/.test(content);

      default:
        return false;
    }
  }

  /**
   * Get highest severity from triggered rules
   */
  getHighestSeverity(triggeredRules) {
    if (triggeredRules.some(r => r.severity === 'high')) return 'high';
    if (triggeredRules.some(r => r.severity === 'medium')) return 'medium';
    return 'low';
  }

  /**
   * Get default error message based on severity
   */
  getDefaultMessage(severity) {
    const messages = {
      high: 'Votre message contient du contenu inappropri\u00e9 et ne peut \u00eatre envoy\u00e9',
      medium: 'Vous ne pouvez pas partager de coordonn\u00e9es ou liens externes. Utilisez la messagerie Baytup.',
      low: 'Votre contenu a \u00e9t\u00e9 signal\u00e9 pour v\u00e9rification'
    };
    return messages[severity] || messages.high;
  }

  /**
   * Log moderation action
   */
  async logModeration(data) {
    try {
      await ModerationLog.create({
        contentType: data.contentType,
        contentId: data.contentId || null,
        user: data.userId,
        originalContent: data.originalContent,
        triggeredRules: data.triggeredRules,
        totalScore: data.totalScore,
        action: data.action,
        metadata: data.metadata
      });
    } catch (error) {
      console.error('Error logging moderation:', error);
    }
  }

  /**
   * Notifier tous les admins d'un message modéré
   */
  async notifyAdminsOfFlaggedMessage({ userId, action, flags, originalContent, conversationId, totalScore }) {
    try {
      const User = require('../models/User');
      const Notification = require('../models/Notification');

      const admins = await User.find({ role: 'admin' }).select('_id').lean();
      if (admins.length === 0) return;

      const categoryLabels = {
        insult: 'Insulte',
        external_contact: 'Contact externe',
        spam: 'Spam',
        inappropriate: 'Contenu inapproprié'
      };
      const flagSummary = flags.map(f => categoryLabels[f] || f).join(', ');
      const actionLabel = action === 'mask' ? 'masqué' : 'signalé';
      const contentPreview = originalContent.substring(0, 80) + (originalContent.length > 80 ? '...' : '');

      const sender = await User.findById(userId).select('firstName lastName').lean();
      const senderName = sender ? `${sender.firstName} ${sender.lastName}` : 'Utilisateur inconnu';

      for (const admin of admins) {
        await Notification.createNotification({
          recipient: admin._id,
          sender: userId,
          type: 'message_flagged',
          title: `Message ${actionLabel} automatiquement`,
          message: `${senderName} : "${contentPreview}" — ${flagSummary} (score: ${totalScore})`,
          data: { conversationId, userId, action, flags, totalScore },
          link: '/dashboard/admin/moderation?tab=flagged',
          priority: action === 'mask' ? 'high' : 'normal'
        });
      }
    } catch (error) {
      console.error('Error notifying admins of flagged message:', error);
    }
  }

  /**
   * Seed règles par défaut (à appeler une fois)
   */
  async seedDefaultRules() {
    const defaultRules = [
      // NIVEAU \u00c9LEV\u00c9 - Insultes graves (FR)
      { name: 'FR_Insult_Severe_1', type: 'keyword', category: 'insult', content: 'connard', severity: 'high', action: 'block', score: 100, appliesTo: ['both'], languages: ['fr'] },
      { name: 'FR_Insult_Severe_2', type: 'keyword', category: 'insult', content: 'enfoir\u00e9', severity: 'high', action: 'block', score: 100, appliesTo: ['both'], languages: ['fr'] },
      { name: 'FR_Insult_Severe_3', type: 'keyword', category: 'insult', content: 'salope', severity: 'high', action: 'block', score: 100, appliesTo: ['both'], languages: ['fr'] },
      { name: 'FR_Insult_Severe_4', type: 'keyword', category: 'insult', content: 'putain', severity: 'high', action: 'block', score: 100, appliesTo: ['both'], languages: ['fr'] },
      { name: 'FR_Insult_Severe_5', type: 'keyword', category: 'insult', content: 'merde', severity: 'medium', action: 'flag', score: 60, appliesTo: ['both'], languages: ['fr'] },
      { name: 'FR_Insult_Severe_6', type: 'keyword', category: 'insult', content: 'encul\u00e9', severity: 'high', action: 'block', score: 100, appliesTo: ['both'], languages: ['fr'] },
      { name: 'FR_Insult_Severe_7', type: 'keyword', category: 'insult', content: 'pute', severity: 'high', action: 'block', score: 100, appliesTo: ['both'], languages: ['fr'] },
      { name: 'FR_Insult_Severe_8', type: 'keyword', category: 'insult', content: 'b\u00e2tard', severity: 'high', action: 'block', score: 100, appliesTo: ['both'], languages: ['fr'] },
      { name: 'FR_Insult_Severe_9', type: 'keyword', category: 'insult', content: 'nique', severity: 'high', action: 'block', score: 100, appliesTo: ['both'], languages: ['fr'] },

      // NIVEAU MOYEN - Insultes mod\u00e9r\u00e9es (FR)
      { name: 'FR_Insult_Medium_1', type: 'keyword', category: 'insult', content: 'abruti', severity: 'medium', action: 'block', score: 80, appliesTo: ['both'], languages: ['fr'] },
      { name: 'FR_Insult_Medium_2', type: 'keyword', category: 'insult', content: 'idiot', severity: 'medium', action: 'block', score: 70, appliesTo: ['both'], languages: ['fr'] },
      { name: 'FR_Insult_Medium_3', type: 'keyword', category: 'insult', content: 'imb\u00e9cile', severity: 'medium', action: 'block', score: 70, appliesTo: ['both'], languages: ['fr'] },
      { name: 'FR_Insult_Medium_4', type: 'keyword', category: 'insult', content: 'd\u00e9bile', severity: 'medium', action: 'block', score: 70, appliesTo: ['both'], languages: ['fr'] },
      { name: 'FR_Insult_Medium_5', type: 'keyword', category: 'insult', content: 'con', severity: 'medium', action: 'block', score: 70, appliesTo: ['both'], languages: ['fr'] },
      { name: 'FR_Insult_Medium_6', type: 'keyword', category: 'insult', content: 'conne', severity: 'medium', action: 'block', score: 70, appliesTo: ['both'], languages: ['fr'] },
      { name: 'FR_Insult_Medium_7', type: 'keyword', category: 'insult', content: 'bouffon', severity: 'medium', action: 'block', score: 70, appliesTo: ['both'], languages: ['fr'] },
      { name: 'FR_Insult_Medium_8', type: 'keyword', category: 'insult', content: 'cretin', severity: 'medium', action: 'block', score: 70, appliesTo: ['both'], languages: ['fr'] },

      // NIVEAU \u00c9LEV\u00c9 - Insultes graves (AR transcrit / dialecte alg\u00e9rien)
      { name: 'AR_Insult_Severe_1', type: 'keyword', category: 'insult', content: 'hmar', severity: 'high', action: 'block', score: 100, appliesTo: ['both'], languages: ['ar'] },
      { name: 'AR_Insult_Severe_2', type: 'keyword', category: 'insult', content: 'kahba', severity: 'high', action: 'block', score: 100, appliesTo: ['both'], languages: ['ar'] },
      { name: 'AR_Insult_Severe_3', type: 'keyword', category: 'insult', content: 'kelb', severity: 'high', action: 'block', score: 100, appliesTo: ['both'], languages: ['ar'] },
      { name: 'AR_Insult_Severe_4', type: 'keyword', category: 'insult', content: 'zebi', severity: 'high', action: 'block', score: 100, appliesTo: ['both'], languages: ['ar'] },
      { name: 'AR_Insult_Severe_5', type: 'keyword', category: 'insult', content: 'nayek', severity: 'high', action: 'block', score: 100, appliesTo: ['both'], languages: ['ar'] },
      { name: 'AR_Insult_Severe_6', type: 'keyword', category: 'insult', content: 'manyouk', severity: 'high', action: 'block', score: 100, appliesTo: ['both'], languages: ['ar'] },
      { name: 'AR_Insult_Severe_7', type: 'keyword', category: 'insult', content: 'zamel', severity: 'high', action: 'block', score: 100, appliesTo: ['both'], languages: ['ar'] },

      // NIVEAU MOYEN - Contact externe (t\u00e9l\u00e9phone avec espaces/points/tirets)
      { name: 'External_Phone_DZ', type: 'pattern', category: 'external_contact', content: '0[567](?:[\\s.\\-]?\\d){8}|\\+213(?:[\\s.\\-]?\\d){9}', severity: 'medium', action: 'block', score: 75, appliesTo: ['both'], languages: ['all'], errorMessage: 'Vous ne pouvez pas partager de num\u00e9ro de t\u00e9l\u00e9phone.' },
      { name: 'External_Email', type: 'pattern', category: 'external_contact', content: '[a-z0-9._%+\\-]+\\s*@\\s*[a-z0-9.\\-]+\\.[a-z]{2,}', severity: 'medium', action: 'block', score: 75, appliesTo: ['both'], languages: ['all'], errorMessage: 'Vous ne pouvez pas partager d\'adresse email.' },
      { name: 'External_Email_Obfuscated', type: 'pattern', category: 'external_contact', content: '[a-z0-9._%+\\-]+\\s*(?:\\[at\\]|\\(at\\)|\\bat\\b|arobase|\\[a\\]|\\(a\\))\\s*[a-z0-9.\\-]+\\.[a-z]{2,}', severity: 'medium', action: 'block', score: 75, appliesTo: ['both'], languages: ['all'], errorMessage: 'Vous ne pouvez pas partager d\'adresse email.' },
      { name: 'External_WhatsApp', type: 'pattern', category: 'external_contact', content: '(whatsapp|wa\\.me|whats\\s*app)', severity: 'medium', action: 'block', score: 75, appliesTo: ['both'], languages: ['all'], errorMessage: 'Vous ne pouvez pas partager de lien WhatsApp.' },
      { name: 'External_Facebook', type: 'pattern', category: 'external_contact', content: '(facebook\\.com|fb\\.com|fb\\.me|instagram\\.com|insta)', severity: 'medium', action: 'block', score: 75, appliesTo: ['both'], languages: ['all'], errorMessage: 'Vous ne pouvez pas partager de lien vers les r\u00e9seaux sociaux.' },
      { name: 'External_URL', type: 'pattern', category: 'external_contact', content: 'https?://(?!.*baytup)', severity: 'medium', action: 'block', score: 70, appliesTo: ['both'], languages: ['all'], errorMessage: 'Vous ne pouvez pas partager de liens externes.' },

      // NIVEAU FAIBLE - Comportements suspects
      { name: 'Behavior_Caps', type: 'behavior', category: 'spam', content: 'excessive_caps', severity: 'low', action: 'flag', score: 30, appliesTo: ['both'], languages: ['all'] },
      { name: 'Behavior_Emoji', type: 'behavior', category: 'spam', content: 'excessive_emoji', severity: 'low', action: 'flag', score: 25, appliesTo: ['both'], languages: ['all'] },
      { name: 'Behavior_Repeat', type: 'behavior', category: 'spam', content: 'repeated_chars', severity: 'low', action: 'flag', score: 20, appliesTo: ['both'], languages: ['all'] },

      // Spam patterns
      { name: 'Spam_Urgent', type: 'pattern', category: 'spam', content: '(urgent|vite|rapide).*contact', severity: 'low', action: 'flag', score: 35, appliesTo: ['message'], languages: ['fr'] }
    ];

    for (const rule of defaultRules) {
      await ModerationRule.findOneAndUpdate(
        { name: rule.name },
        rule,
        { upsert: true, new: true }
      );
    }

    console.log(`Seeded ${defaultRules.length} default moderation rules`);
  }
}

module.exports = new ModerationService();
