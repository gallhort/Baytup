const ModerationRule = require('../models/ModerationRule');
const ModerationLog = require('../models/ModerationLog');

/**
 * Moderation Service
 * Système de modération automatique pour messages et avis
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
        message: null
      };
    }

    const rules = await this.loadRules();
    const triggeredRules = [];
    let totalScore = 0;

    // Filter rules applicable to this content type
    const applicableRules = rules.filter(rule =>
      rule.appliesTo.includes(contentType) || rule.appliesTo.includes('both')
    );

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
          action: rule.action
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

    if (triggeredRules.length > 0) {
      // Find highest severity rule
      const hasBlock = triggeredRules.some(r => r.action === 'block');
      const highestSeverity = this.getHighestSeverity(triggeredRules);

      if (hasBlock) {
        finalAction = 'block';
        level = 'high';

        // Get custom error message from highest severity rule
        const blockRule = applicableRules.find(r =>
          r.action === 'block' && triggeredRules.some(tr => tr.ruleId.toString() === r._id.toString())
        );
        message = blockRule?.errorMessage || this.getDefaultMessage(highestSeverity);
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
      flags: triggeredRules.map(r => r.category),
      triggeredRules,
      totalScore,
      message
    };
  }

  /**
   * Check si un contenu match une règle spécifique
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
   * Check mot-clé simple
   */
  checkKeyword(content, keyword) {
    const pattern = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'i');
    return pattern.test(content);
  }

  /**
   * Check pattern regex
   */
  checkPattern(content, pattern) {
    try {
      const regex = new RegExp(pattern, 'i');
      return regex.test(content);
    } catch (e) {
      console.error('Invalid regex pattern:', pattern, e);
      return false;
    }
  }

  /**
   * Check comportement suspect (majuscules, répétitions, etc.)
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
        // Caractères répétés 5+ fois
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
      high: 'Votre message contient du contenu inapproprié et ne peut être envoyé',
      medium: 'Vous ne pouvez pas partager de coordonnées ou liens externes. Utilisez la messagerie Baytup.',
      low: 'Votre contenu a été signalé pour vérification'
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
   * Seed règles par défaut (à appeler une fois)
   */
  async seedDefaultRules() {
    const defaultRules = [
      // NIVEAU ÉLEVÉ - Insultes graves (FR)
      { name: 'FR_Insult_Severe_1', type: 'keyword', category: 'insult', content: 'connard', severity: 'high', action: 'block', score: 100, appliesTo: ['both'], languages: ['fr'] },
      { name: 'FR_Insult_Severe_2', type: 'keyword', category: 'insult', content: 'enfoiré', severity: 'high', action: 'block', score: 100, appliesTo: ['both'], languages: ['fr'] },
      { name: 'FR_Insult_Severe_3', type: 'keyword', category: 'insult', content: 'salope', severity: 'high', action: 'block', score: 100, appliesTo: ['both'], languages: ['fr'] },
      { name: 'FR_Insult_Severe_4', type: 'keyword', category: 'insult', content: 'putain', severity: 'high', action: 'block', score: 100, appliesTo: ['both'], languages: ['fr'] },
      { name: 'FR_Insult_Severe_5', type: 'keyword', category: 'insult', content: 'merde', severity: 'medium', action: 'flag', score: 60, appliesTo: ['both'], languages: ['fr'] },

      // NIVEAU ÉLEVÉ - Insultes graves (AR transcrit)
      { name: 'AR_Insult_Severe_1', type: 'keyword', category: 'insult', content: 'hmar', severity: 'high', action: 'block', score: 100, appliesTo: ['both'], languages: ['ar'] },
      { name: 'AR_Insult_Severe_2', type: 'keyword', category: 'insult', content: 'kahba', severity: 'high', action: 'block', score: 100, appliesTo: ['both'], languages: ['ar'] },
      { name: 'AR_Insult_Severe_3', type: 'keyword', category: 'insult', content: 'kelb', severity: 'high', action: 'block', score: 100, appliesTo: ['both'], languages: ['ar'] },

      // NIVEAU MOYEN - Contact externe
      { name: 'External_Phone_DZ', type: 'pattern', category: 'external_contact', content: '(0[567]\\d{8}|\\+213\\d{9})', severity: 'medium', action: 'block', score: 75, appliesTo: ['both'], languages: ['all'], errorMessage: 'Vous ne pouvez pas partager de numéro de téléphone. Utilisez la messagerie Baytup.' },
      { name: 'External_Email', type: 'pattern', category: 'external_contact', content: '[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}', severity: 'medium', action: 'block', score: 75, appliesTo: ['both'], languages: ['all'], errorMessage: 'Vous ne pouvez pas partager d\'adresse email.' },
      { name: 'External_WhatsApp', type: 'pattern', category: 'external_contact', content: '(whatsapp|wa\\.me)', severity: 'medium', action: 'block', score: 75, appliesTo: ['both'], languages: ['all'], errorMessage: 'Vous ne pouvez pas partager de lien WhatsApp.' },
      { name: 'External_Facebook', type: 'pattern', category: 'external_contact', content: '(facebook\\.com|fb\\.com|fb\\.me)', severity: 'medium', action: 'block', score: 75, appliesTo: ['both'], languages: ['all'], errorMessage: 'Vous ne pouvez pas partager de lien Facebook.' },
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

    console.log(`✅ Seeded ${defaultRules.length} default moderation rules`);
  }
}

module.exports = new ModerationService();
