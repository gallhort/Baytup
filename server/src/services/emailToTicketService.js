const Ticket = require('../models/Ticket');
const User = require('../models/User');

/**
 * Email-to-Ticket Service
 * Convertit les emails entrants en tickets support
 * Compatible avec webhooks: Mailgun, SendGrid, Postmark, etc.
 */
class EmailToTicketService {
  /**
   * Parse email et créer ticket
   * @param {Object} emailData - Données email du webhook
   * @returns {Object} Ticket créé ou erreur
   */
  async processIncomingEmail(emailData) {
    try {
      // Extract email fields (format dépend du provider)
      const fromEmail = this.extractEmail(emailData.from || emailData.sender || emailData['From']);
      const subject = emailData.subject || emailData['Subject'] || 'No Subject';
      const body = this.extractBody(emailData);
      const messageId = emailData['message-id'] || emailData.messageId;
      const inReplyTo = emailData['in-reply-to'] || emailData.inReplyTo;
      const references = this.parseReferences(emailData.references || emailData['References']);

      // Find user by email
      const user = await User.findOne({ email: fromEmail });

      if (!user) {
        console.log(`Email-to-Ticket: User not found for email ${fromEmail}`);
        return {
          success: false,
          error: 'User not found',
          email: fromEmail
        };
      }

      // Check if email is a reply to existing ticket
      if (inReplyTo || references.length > 0) {
        const existingTicket = await this.findTicketByEmailRef(inReplyTo, references);

        if (existingTicket) {
          // Add message to existing ticket
          await existingTicket.addMessage(
            user._id,
            body,
            'user',
            [], // attachments TODO: parse attachments
            false
          );

          console.log(`Email-to-Ticket: Added reply to ticket ${existingTicket.ticketNumber}`);

          return {
            success: true,
            action: 'reply_added',
            ticket: existingTicket
          };
        }
      }

      // Extract category from subject or body
      const category = this.detectCategory(subject, body);

      // Extract priority from subject
      const priority = this.detectPriority(subject);

      // Create new ticket
      const ticket = await Ticket.create({
        user: user._id,
        subject: this.cleanSubject(subject),
        description: body,
        category,
        priority,
        emailMetadata: {
          fromEmail,
          toEmail: emailData.to || emailData['To'],
          messageId,
          inReplyTo,
          references,
          receivedAt: new Date()
        },
        messages: [{
          sender: user._id,
          senderType: 'user',
          content: body,
          createdAt: new Date()
        }]
      });

      await ticket.populate('user', 'firstName lastName email');

      console.log(`Email-to-Ticket: Created ticket ${ticket.ticketNumber} from ${fromEmail}`);

      return {
        success: true,
        action: 'ticket_created',
        ticket
      };
    } catch (error) {
      console.error('Email-to-Ticket processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extract email address from "Name <email@domain.com>" format
   */
  extractEmail(emailString) {
    if (!emailString) return null;

    const match = emailString.match(/<(.+?)>/);
    if (match) {
      return match[1].toLowerCase();
    }

    return emailString.toLowerCase().trim();
  }

  /**
   * Extract body from email (plain text or HTML)
   */
  extractBody(emailData) {
    // Try different body fields depending on provider
    let body = emailData.body || emailData['body-plain'] || emailData.text || emailData.TextBody;

    // If HTML only, strip tags (basic)
    if (!body && (emailData.html || emailData['body-html'] || emailData.HtmlBody)) {
      const htmlBody = emailData.html || emailData['body-html'] || emailData.HtmlBody;
      body = this.stripHtml(htmlBody);
    }

    if (!body) {
      body = 'No content';
    }

    // Clean email replies (remove quoted text)
    body = this.cleanEmailBody(body);

    return body.trim();
  }

  /**
   * Strip HTML tags (basic)
   */
  stripHtml(html) {
    return html
      .replace(/<style[^>]*>.*<\/style>/gmi, '')
      .replace(/<script[^>]*>.*<\/script>/gmi, '')
      .replace(/<[^>]+>/gm, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  /**
   * Clean email body (remove signatures, quoted text)
   */
  cleanEmailBody(body) {
    // Remove everything after common reply markers
    const replyMarkers = [
      /^On .+ wrote:$/m,
      /^Le .+ a écrit :$/m,
      /^-{3,} Original Message -{3,}/m,
      /^_{10,}/m,
      /^From: .+$/m
    ];

    for (const marker of replyMarkers) {
      const match = body.match(marker);
      if (match) {
        body = body.substring(0, match.index).trim();
        break;
      }
    }

    // Remove email signatures (lines after -- or __)
    const sigMatch = body.match(/\n--\s*\n|\n__\s*\n/);
    if (sigMatch) {
      body = body.substring(0, sigMatch.index).trim();
    }

    return body;
  }

  /**
   * Clean subject (remove Re:, Fwd:, etc.)
   */
  cleanSubject(subject) {
    return subject
      .replace(/^(Re|RE|Fw|FW|Fwd|FWD):\s*/gi, '')
      .trim();
  }

  /**
   * Parse References header
   */
  parseReferences(referencesString) {
    if (!referencesString) return [];

    if (Array.isArray(referencesString)) {
      return referencesString;
    }

    return referencesString
      .split(/\s+/)
      .filter(ref => ref.trim())
      .map(ref => ref.replace(/[<>]/g, ''));
  }

  /**
   * Find existing ticket by email message-id or references
   */
  async findTicketByEmailRef(inReplyTo, references) {
    const searchRefs = [inReplyTo, ...references].filter(Boolean);

    if (searchRefs.length === 0) {
      return null;
    }

    const ticket = await Ticket.findOne({
      $or: [
        { 'emailMetadata.messageId': { $in: searchRefs } },
        { 'emailMetadata.inReplyTo': { $in: searchRefs } },
        { 'emailMetadata.references': { $in: searchRefs } }
      ]
    }).sort('-createdAt');

    return ticket;
  }

  /**
   * Detect category from subject/body keywords
   */
  detectCategory(subject, body) {
    const text = `${subject} ${body}`.toLowerCase();

    const categoryKeywords = {
      booking: ['booking', 'reservation', 'réservation', 'réserver'],
      payment: ['payment', 'paiement', 'refund', 'remboursement', 'stripe', 'card', 'carte'],
      listing: ['listing', 'annonce', 'property', 'propriété', 'logement'],
      account: ['account', 'compte', 'login', 'password', 'mot de passe', 'email'],
      technical: ['bug', 'error', 'erreur', 'doesn\'t work', 'ne fonctionne pas'],
      dispute: ['dispute', 'litige', 'problem', 'problème', 'complaint', 'plainte'],
      verification: ['verify', 'verification', 'vérification', 'document']
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category;
      }
    }

    return 'other';
  }

  /**
   * Detect priority from subject keywords
   */
  detectPriority(subject) {
    const subjectLower = subject.toLowerCase();

    if (subjectLower.includes('urgent') || subjectLower.includes('emergency') || subjectLower.includes('critique')) {
      return 'urgent';
    }

    if (subjectLower.includes('important') || subjectLower.includes('asap')) {
      return 'high';
    }

    return 'normal';
  }

  /**
   * Validate email webhook signature (for security)
   * Example for Mailgun
   */
  validateMailgunSignature(timestamp, token, signature, signingKey) {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', signingKey);
    hmac.update(timestamp + token);
    const computedSignature = hmac.digest('hex');
    return computedSignature === signature;
  }

  /**
   * Validate SendGrid webhook signature
   */
  validateSendGridSignature(publicKey, payload, signature, timestamp) {
    const crypto = require('crypto');
    const ecdsa = crypto.createVerify('sha256');
    ecdsa.update(timestamp + payload);
    return ecdsa.verify(publicKey, signature, 'base64');
  }
}

module.exports = new EmailToTicketService();
