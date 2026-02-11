const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const twoFactorService = require('../services/twoFactorService');
const emailOTPService = require('../services/emailOTPService');
const { mark2FAVerified, markEmailOTPVerified } = require('../middleware/require2FA');

/**
 * Two-Factor Authentication Controller
 * Gère setup, vérification, désactivation et backup codes
 */

/**
 * GET /api/auth/2fa/status
 * Obtenir le statut 2FA de l'utilisateur
 */
exports.get2FAStatus = async (req, res) => {
  try {
    const user = req.user;

    const status = twoFactorService.check2FAStatus(user);

    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    console.error('Get 2FA status error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du statut 2FA'
    });
  }
};

/**
 * POST /api/auth/2fa/setup
 * Générer secret TOTP et QR code pour setup
 */
exports.setup2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    // Si déjà activée, retourner erreur
    if (user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: '2FA déjà activée. Désactivez-la d\'abord pour reconfigurer.'
      });
    }

    // Générer secret + QR code + backup codes
    const { secret, qrCode, backupCodes } = await twoFactorService.generateSecret(
      user.fullName,
      user.email
    );

    // Hasher backup codes pour stockage
    const hashedCodes = await twoFactorService.hashBackupCodes(backupCodes);

    // Stocker temporairement le secret (pas encore activé)
    user.twoFactorSecret = secret;
    user.backupCodes = hashedCodes;
    await user.save();

    // Log action
    await AuditLog.log({
      userId: user._id,
      action: '2FA_ENABLED',
      details: {
        metadata: { status: 'setup_initiated' }
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      severity: 'medium'
    });

    res.json({
      success: true,
      message: 'Secret 2FA généré. Scannez le QR code avec votre app.',
      qrCode, // Data URL du QR code
      backupCodes, // Codes de secours non hashés (à afficher une seule fois)
      secret // Secret en base32 (optionnel, pour saisie manuelle)
    });
  } catch (error) {
    console.error('Setup 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la configuration 2FA'
    });
  }
};

/**
 * POST /api/auth/2fa/verify-setup
 * Vérifier le code TOTP et activer la 2FA
 */
exports.verifySetup = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token || token.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'Code invalide. Le code doit contenir 6 chiffres.'
      });
    }

    const user = await User.findById(req.user.id).select('+twoFactorSecret');

    if (!user.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        message: 'Aucun setup 2FA en cours. Lancez d\'abord le setup.'
      });
    }

    // Vérifier le code TOTP
    const isValid = twoFactorService.verifyTOTP(user.twoFactorSecret, token);

    if (!isValid) {
      await AuditLog.log({
        userId: user._id,
        action: '2FA_FAILED',
        details: {
          metadata: { reason: 'Invalid TOTP during setup' }
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        status: 'failed',
        severity: 'low'
      });

      return res.status(400).json({
        success: false,
        message: 'Code incorrect. Vérifiez le code dans votre app.'
      });
    }

    // Activer la 2FA
    user.twoFactorEnabled = true;
    user.twoFactorEnabledAt = new Date();
    await user.save();

    // Marquer session comme vérifiée
    mark2FAVerified(req);

    // Log succès
    await AuditLog.log({
      userId: user._id,
      action: '2FA_ENABLED',
      details: {
        metadata: { status: 'activated' }
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      severity: 'medium'
    });

    res.json({
      success: true,
      message: 'Authentification à 2 facteurs activée avec succès!'
    });
  } catch (error) {
    console.error('Verify setup 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification du setup'
    });
  }
};

/**
 * POST /api/auth/2fa/verify
 * Vérifier code TOTP lors du login
 */
exports.verify2FA = async (req, res) => {
  try {
    const { token, useBackupCode } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Code requis'
      });
    }

    const user = await User.findById(req.user.id)
      .select('+twoFactorSecret +backupCodes');

    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: '2FA non activée sur ce compte'
      });
    }

    let isValid = false;
    let usedBackupCode = false;

    // Vérifier backup code
    if (useBackupCode) {
      const { valid, codeIndex } = await twoFactorService.verifyBackupCode(
        token,
        user.backupCodes
      );

      if (valid) {
        // Marquer le code comme utilisé
        user.backupCodes[codeIndex].used = true;
        user.backupCodes[codeIndex].usedAt = new Date();
        await user.save();

        isValid = true;
        usedBackupCode = true;

        // Log utilisation backup code
        await AuditLog.log({
          userId: user._id,
          action: 'BACKUP_CODE_USED',
          details: {
            metadata: {
              remainingCodes: user.backupCodes.filter(c => !c.used).length
            }
          },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          severity: 'medium'
        });
      }
    } else {
      // Vérifier TOTP normal
      isValid = twoFactorService.verifyTOTP(user.twoFactorSecret, token);
    }

    if (!isValid) {
      await AuditLog.log({
        userId: user._id,
        action: '2FA_FAILED',
        details: {
          metadata: {
            reason: useBackupCode ? 'Invalid backup code' : 'Invalid TOTP',
            ipAddress: req.ip
          }
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        status: 'failed',
        severity: 'medium'
      });

      return res.status(400).json({
        success: false,
        message: 'Code incorrect'
      });
    }

    // Marquer session comme vérifiée
    mark2FAVerified(req);

    // Log succès
    await AuditLog.log({
      userId: user._id,
      action: '2FA_VERIFIED',
      details: {
        metadata: {
          method: usedBackupCode ? 'backup_code' : 'totp'
        }
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      severity: 'low'
    });

    const remainingBackupCodes = user.backupCodes.filter(c => !c.used).length;

    res.json({
      success: true,
      message: 'Code vérifié avec succès',
      usedBackupCode,
      ...(usedBackupCode && { remainingBackupCodes })
    });
  } catch (error) {
    console.error('Verify 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification'
    });
  }
};

/**
 * POST /api/auth/2fa/disable
 * Désactiver la 2FA (nécessite password confirmation)
 */
exports.disable2FA = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Mot de passe requis pour désactiver la 2FA'
      });
    }

    const user = await User.findById(req.user.id).select('+password');

    // Vérifier password
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Mot de passe incorrect'
      });
    }

    // Désactiver 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.backupCodes = [];
    user.twoFactorEnabledAt = undefined;
    await user.save();

    // Log action
    await AuditLog.log({
      userId: user._id,
      action: '2FA_DISABLED',
      details: {
        metadata: { reason: 'User disabled' }
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      severity: 'high'
    });

    res.json({
      success: true,
      message: 'Authentification à 2 facteurs désactivée'
    });
  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la désactivation'
    });
  }
};

/**
 * POST /api/auth/2fa/regenerate-backup-codes
 * Régénérer les backup codes
 */
exports.regenerateBackupCodes = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: '2FA non activée'
      });
    }

    // Générer nouveaux codes
    const { backupCodes, hashedCodes } = await twoFactorService.regenerateBackupCodes();

    // Remplacer les anciens codes
    user.backupCodes = hashedCodes;
    user.lastBackupCodeGeneration = new Date();
    await user.save();

    // Log action
    await AuditLog.log({
      userId: user._id,
      action: 'BACKUP_CODES_REGENERATED',
      details: {
        metadata: { count: backupCodes.length }
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      severity: 'medium'
    });

    res.json({
      success: true,
      message: 'Codes de secours régénérés',
      backupCodes // Non hashés (à afficher une seule fois)
    });
  } catch (error) {
    console.error('Regenerate backup codes error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la régénération'
    });
  }
};

/**
 * POST /api/auth/email-otp/send
 * Envoyer un code OTP par email (pour actions sensibles)
 */
exports.sendEmailOTP = async (req, res) => {
  try {
    const { reason } = req.body;
    const user = req.user;

    const result = await emailOTPService.sendOTP(user.email, reason || 'verification');

    if (!result.success) {
      return res.status(429).json(result);
    }

    res.json({
      success: true,
      message: `Code envoyé à ${user.email}`
    });
  } catch (error) {
    console.error('Send email OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi du code'
    });
  }
};

/**
 * POST /api/auth/email-otp/verify
 * Vérifier un code OTP email
 */
exports.verifyEmailOTP = async (req, res) => {
  try {
    const { code } = req.body;
    const user = req.user;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Code requis'
      });
    }

    const result = await emailOTPService.verifyOTP(user.email, code);

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    // Marquer session comme vérifiée
    markEmailOTPVerified(req);

    res.json({
      success: true,
      message: 'Code vérifié avec succès'
    });
  } catch (error) {
    console.error('Verify email OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification'
    });
  }
};

module.exports = exports;
