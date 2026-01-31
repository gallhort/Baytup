const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Two-Factor Authentication Service
 * TOTP (Time-based One-Time Password) + Backup Codes
 * Compatible Google Authenticator, Authy, Microsoft Authenticator
 */

class TwoFactorService {
  /**
   * Générer un secret TOTP pour un utilisateur
   * @param {string} userName - Nom de l'utilisateur
   * @param {string} email - Email de l'utilisateur
   * @returns {Promise<{secret: string, qrCode: string, backupCodes: string[]}>}
   */
  async generateSecret(userName, email) {
    try {
      // Générer secret TOTP
      const secret = speakeasy.generateSecret({
        name: `Baytup (${email})`,
        issuer: 'Baytup',
        length: 32,
      });

      // Générer QR Code pour scanner avec Google Authenticator
      const qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url);

      // Générer 10 backup codes
      const backupCodes = this.generateBackupCodes(10);

      return {
        secret: secret.base32, // Base32 encoded secret à stocker en DB
        qrCode: qrCodeDataURL, // Data URL du QR code
        backupCodes, // Codes de secours (non hashés pour affichage)
      };
    } catch (error) {
      console.error('Generate 2FA secret error:', error);
      throw error;
    }
  }

  /**
   * Générer des backup codes
   * Format : XXXX-XXXX (4 caractères - 4 caractères)
   * @param {number} count - Nombre de codes à générer
   * @returns {string[]} Array de backup codes
   */
  generateBackupCodes(count = 10) {
    const codes = [];
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sans caractères ambigus (0,O,1,I)

    for (let i = 0; i < count; i++) {
      let code = '';
      // Première partie (4 caractères)
      for (let j = 0; j < 4; j++) {
        code += chars[crypto.randomInt(0, chars.length)];
      }
      code += '-';
      // Deuxième partie (4 caractères)
      for (let j = 0; j < 4; j++) {
        code += chars[crypto.randomInt(0, chars.length)];
      }
      codes.push(code);
    }

    return codes;
  }

  /**
   * Hasher les backup codes pour stockage en DB
   * @param {string[]} codes - Array de codes en clair
   * @returns {Promise<Array<{code: string, used: boolean}>>}
   */
  async hashBackupCodes(codes) {
    const hashedCodes = [];
    for (const code of codes) {
      const hash = await bcrypt.hash(code, 10);
      hashedCodes.push({
        code: hash,
        used: false,
      });
    }
    return hashedCodes;
  }

  /**
   * Vérifier un code TOTP (6 chiffres de Google Authenticator)
   * @param {string} secret - Secret base32 de l'utilisateur
   * @param {string} token - Code 6 chiffres fourni par l'utilisateur
   * @returns {boolean} true si valide
   */
  verifyTOTP(secret, token) {
    try {
      return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 2, // Tolérance ±60 secondes (2 x 30s)
      });
    } catch (error) {
      console.error('Verify TOTP error:', error);
      return false;
    }
  }

  /**
   * Vérifier un backup code
   * @param {string} providedCode - Code fourni par l'utilisateur
   * @param {Array<{code: string, used: boolean}>} storedCodes - Codes hashés en DB
   * @returns {Promise<{valid: boolean, codeIndex: number}>}
   */
  async verifyBackupCode(providedCode, storedCodes) {
    try {
      // Normaliser le code (enlever espaces, mettre en majuscules)
      const normalized = providedCode.replace(/\s/g, '').toUpperCase();

      for (let i = 0; i < storedCodes.length; i++) {
        const stored = storedCodes[i];

        // Skip si déjà utilisé
        if (stored.used) continue;

        // Comparer avec bcrypt
        const match = await bcrypt.compare(normalized, stored.code);
        if (match) {
          return {
            valid: true,
            codeIndex: i, // Index du code utilisé (pour marquer comme used)
          };
        }
      }

      return {
        valid: false,
        codeIndex: -1,
      };
    } catch (error) {
      console.error('Verify backup code error:', error);
      return {
        valid: false,
        codeIndex: -1,
      };
    }
  }

  /**
   * Régénérer des backup codes (après utilisation ou sur demande)
   * @returns {Promise<{backupCodes: string[], hashedCodes: Array}>}
   */
  async regenerateBackupCodes() {
    const backupCodes = this.generateBackupCodes(10);
    const hashedCodes = await this.hashBackupCodes(backupCodes);

    return {
      backupCodes, // Non hashés (pour affichage à l'utilisateur)
      hashedCodes, // Hashés (pour stockage en DB)
    };
  }

  /**
   * Vérifier le statut 2FA d'un utilisateur et recommander activation
   * @param {Object} user - Document User de MongoDB
   * @returns {Object} Statut et recommandations
   */
  check2FAStatus(user) {
    const status = {
      enabled: user.twoFactorEnabled || false,
      backupCodesCount: user.backupCodes ? user.backupCodes.filter(c => !c.used).length : 0,
      shouldEnable: false,
      reason: '',
    };

    // Logique de recommandation (style Airbnb)
    if (!user.twoFactorEnabled) {
      // Host avec revenus ou escrow
      if (user.role === 'host') {
        status.shouldEnable = true;
        status.reason = 'Protégez vos revenus avec l\'authentification à 2 facteurs';
      }
      // Utilisateur avec méthode de paiement
      else if (user.stripeConnect?.accountId || user.paymentMethods?.length > 0) {
        status.shouldEnable = true;
        status.reason = 'Sécurisez votre compte avec l\'authentification à 2 facteurs';
      }
    }

    // Avertissement si peu de backup codes
    if (user.twoFactorEnabled && status.backupCodesCount < 3) {
      status.warning = 'Il vous reste moins de 3 codes de secours. Régénérez-les.';
    }

    return status;
  }
}

module.exports = new TwoFactorService();
