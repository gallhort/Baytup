const crypto = require('crypto');
const nodemailer = require('nodemailer');

/**
 * Email OTP Service - Génération et vérification de codes OTP par email
 * Style Airbnb : codes 6 chiffres, expiration 10 minutes, rate limiting
 */

class EmailOTPService {
  constructor() {
    // Configuration email (utilise les mêmes settings que le reste de l'app)
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Store OTP en mémoire (production: utiliser Redis)
    this.otpStore = new Map();

    // Rate limiting : max 3 tentatives par email par heure
    this.rateLimits = new Map();
  }

  /**
   * Générer un code OTP 6 chiffres
   * @returns {string} Code 6 chiffres
   */
  generateOTPCode() {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Vérifier rate limiting
   * @param {string} email - Email de l'utilisateur
   * @returns {boolean} true si peut envoyer, false sinon
   */
  checkRateLimit(email) {
    const now = Date.now();
    const userLimits = this.rateLimits.get(email) || { count: 0, resetAt: now + 3600000 };

    // Reset si l'heure est passée
    if (now > userLimits.resetAt) {
      userLimits.count = 0;
      userLimits.resetAt = now + 3600000;
    }

    // Max 3 envois par heure
    if (userLimits.count >= 3) {
      return false;
    }

    userLimits.count++;
    this.rateLimits.set(email, userLimits);
    return true;
  }

  /**
   * Envoyer un code OTP par email
   * @param {string} email - Email destinataire
   * @param {string} reason - Raison de l'OTP (verification, password-reset, etc.)
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async sendOTP(email, reason = 'verification') {
    try {
      // Rate limiting
      if (!this.checkRateLimit(email)) {
        return {
          success: false,
          message: 'Trop de tentatives. Réessayez dans 1 heure.',
        };
      }

      // Générer code
      const code = this.generateOTPCode();
      const expiresAt = Date.now() + 600000; // 10 minutes

      // Stocker (en production: Redis avec TTL)
      this.otpStore.set(email, {
        code,
        expiresAt,
        reason,
        attempts: 0,
      });

      // Template email selon raison
      const templates = {
        verification: {
          subject: '🔐 Code de vérification Baytup',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #00ff88;">Vérification de votre compte</h2>
              <p>Votre code de vérification est :</p>
              <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                ${code}
              </div>
              <p style="color: #666;">Ce code expire dans 10 minutes.</p>
              <p style="color: #666;">Si vous n'avez pas demandé ce code, ignorez cet email.</p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px;">Baytup - Location de véhicules entre particuliers</p>
            </div>
          `,
        },
        'password-reset': {
          subject: '🔑 Réinitialisation de mot de passe',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #ff6b6b;">Réinitialisation de mot de passe</h2>
              <p>Votre code de vérification est :</p>
              <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                ${code}
              </div>
              <p style="color: #666;">Ce code expire dans 10 minutes.</p>
              <p style="color: #666;">Si vous n'avez pas demandé ce code, <strong>changez votre mot de passe immédiatement</strong>.</p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px;">Baytup - Location de véhicules entre particuliers</p>
            </div>
          `,
        },
        'email-change': {
          subject: '📧 Changement d\'adresse email',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #00d4ff;">Changement d'adresse email</h2>
              <p>Vous avez demandé à changer votre adresse email. Votre code de vérification est :</p>
              <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                ${code}
              </div>
              <p style="color: #666;">Ce code expire dans 10 minutes.</p>
              <p style="color: #666;">Si vous n'avez pas demandé ce changement, ignorez cet email et contactez le support.</p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px;">Baytup - Location de véhicules entre particuliers</p>
            </div>
          `,
        },
      };

      const template = templates[reason] || templates.verification;

      // Envoyer email
      await this.transporter.sendMail({
        from: `"Baytup" <${process.env.SMTP_USER}>`,
        to: email,
        subject: template.subject,
        html: template.html,
      });

      return {
        success: true,
        message: 'Code OTP envoyé par email',
      };
    } catch (error) {
      console.error('Send OTP error:', error);
      return {
        success: false,
        message: 'Erreur lors de l\'envoi du code',
      };
    }
  }

  /**
   * Vérifier un code OTP
   * @param {string} email - Email de l'utilisateur
   * @param {string} code - Code à vérifier
   * @returns {Promise<{valid: boolean, message: string}>}
   */
  async verifyOTP(email, code) {
    const stored = this.otpStore.get(email);

    if (!stored) {
      return {
        valid: false,
        message: 'Code invalide ou expiré',
      };
    }

    // Vérifier expiration
    if (Date.now() > stored.expiresAt) {
      this.otpStore.delete(email);
      return {
        valid: false,
        message: 'Code expiré. Demandez un nouveau code.',
      };
    }

    // Max 5 tentatives
    if (stored.attempts >= 5) {
      this.otpStore.delete(email);
      return {
        valid: false,
        message: 'Trop de tentatives. Demandez un nouveau code.',
      };
    }

    // Vérifier code
    if (stored.code !== code) {
      stored.attempts++;
      return {
        valid: false,
        message: `Code incorrect. ${5 - stored.attempts} tentative(s) restante(s).`,
      };
    }

    // Code valide : supprimer du store
    this.otpStore.delete(email);
    return {
      valid: true,
      message: 'Code vérifié avec succès',
    };
  }

  /**
   * Envoyer notification d'action sensible (style Airbnb)
   * @param {string} email - Email destinataire
   * @param {string} action - Type d'action (iban-changed, login-suspicious, etc.)
   * @param {Object} data - Données supplémentaires
   */
  async sendSecurityNotification(email, action, data = {}) {
    try {
      const templates = {
        'iban-changed': {
          subject: '🔒 Votre compte bancaire a été modifié',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin-bottom: 20px;">
                <strong>⚠️ Action importante détectée</strong>
              </div>
              <h2>Compte bancaire modifié</h2>
              <p>Votre compte bancaire Stripe Connect a été modifié le ${new Date(data.changedAt).toLocaleString('fr-FR')}.</p>
              <div style="background: #f5f5f5; padding: 15px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Ancien compte :</strong> ${data.oldAccount || 'N/A'}</p>
                <p style="margin: 5px 0;"><strong>Nouveau compte :</strong> ${data.newAccount}</p>
              </div>
              <p>Si vous n'avez pas effectué ce changement, <strong style="color: #ff6b6b;">cliquez immédiatement sur le lien ci-dessous</strong> :</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.notMeLink}" style="background: #ff6b6b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Ce n'était pas moi
                </a>
              </div>
              <p style="color: #666;">Si vous avez effectué ce changement, vous pouvez ignorer cet email.</p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px;">Support : <a href="${data.supportLink}">support@baytup.com</a></p>
            </div>
          `,
        },
        'login-suspicious': {
          subject: '🔐 Connexion suspecte détectée',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin-bottom: 20px;">
                <strong>⚠️ Nouvelle connexion détectée</strong>
              </div>
              <h2>Connexion depuis un nouvel appareil</h2>
              <p>Une connexion à votre compte a été effectuée :</p>
              <div style="background: #f5f5f5; padding: 15px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Date :</strong> ${new Date(data.loginAt).toLocaleString('fr-FR')}</p>
                <p style="margin: 5px 0;"><strong>Appareil :</strong> ${data.device}</p>
                <p style="margin: 5px 0;"><strong>Localisation :</strong> ${data.location}</p>
                <p style="margin: 5px 0;"><strong>IP :</strong> ${data.ip}</p>
              </div>
              <p>Si vous reconnaissez cette connexion, vous pouvez ignorer cet email.</p>
              <p>Sinon, <strong style="color: #ff6b6b;">changez immédiatement votre mot de passe</strong> :</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.resetPasswordLink}" style="background: #ff6b6b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Changer mon mot de passe
                </a>
              </div>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px;">Support : <a href="${data.supportLink}">support@baytup.com</a></p>
            </div>
          `,
        },
      };

      const template = templates[action];
      if (!template) {
        throw new Error(`Unknown security notification action: ${action}`);
      }

      await this.transporter.sendMail({
        from: `"Baytup Security" <${process.env.SMTP_USER}>`,
        to: email,
        subject: template.subject,
        html: template.html,
      });

      return { success: true };
    } catch (error) {
      console.error('Send security notification error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailOTPService();
