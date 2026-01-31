const express = require('express');
const router = express.Router();
const twoFactorController = require('../controllers/twoFactorController');
const { authenticate } = require('../middleware/auth');

/**
 * Routes 2FA
 * Toutes les routes nécessitent authentification (JWT/session)
 */

// Obtenir le statut 2FA
router.get('/status', authenticate, twoFactorController.get2FAStatus);

// Setup 2FA (générer QR code + backup codes)
router.post('/setup', authenticate, twoFactorController.setup2FA);

// Vérifier setup (activer 2FA après scan QR code)
router.post('/verify-setup', authenticate, twoFactorController.verifySetup);

// Vérifier code 2FA (lors du login ou action sensible)
router.post('/verify', authenticate, twoFactorController.verify2FA);

// Désactiver 2FA
router.post('/disable', authenticate, twoFactorController.disable2FA);

// Régénérer backup codes
router.post('/regenerate-backup-codes', authenticate, twoFactorController.regenerateBackupCodes);

// Email OTP (pour users sans 2FA activée)
router.post('/email-otp/send', authenticate, twoFactorController.sendEmailOTP);
router.post('/email-otp/verify', authenticate, twoFactorController.verifyEmailOTP);

module.exports = router;
