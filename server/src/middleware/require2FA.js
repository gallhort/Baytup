const AuditLog = require('../models/AuditLog');

/**
 * Middleware 2FA - Style Airbnb
 * Vérifie si 2FA requis et validé pour certaines actions
 */

/**
 * Vérifie si l'utilisateur a activé la 2FA et si elle est vérifiée pour cette session
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
const require2FA = (req, res, next) => {
  const user = req.user;

  // Pas de 2FA activée = pas de vérification requise
  if (!user.twoFactorEnabled) {
    return next();
  }

  // Vérifier si 2FA déjà vérifiée pour cette session
  if (req.session && req.session.twoFactorVerified === true) {
    return next();
  }

  // 2FA requise mais pas vérifiée
  return res.status(403).json({
    error: '2FA_REQUIRED',
    message: 'Authentification à 2 facteurs requise',
    twoFactorEnabled: true,
    requiresVerification: true
  });
};

/**
 * Force la 2FA pour les hosts
 * Si pas activée, retourne erreur avec lien de setup
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
const requireHost2FA = async (req, res, next) => {
  const user = req.user;

  // Vérifier que c'est un host
  if (user.role !== 'host' && !user.hostInfo?.isHost) {
    return next(); // Pas un host, skip
  }

  // Host sans 2FA activée = suggérer fortement (mais pas bloquer)
  // Note: on ne force pas car Airbnb ne le fait pas non plus
  if (!user.twoFactorEnabled) {
    // Log la tentative (pour analytics)
    await AuditLog.log({
      userId: user._id,
      action: 'SUSPICIOUS_ACTIVITY',
      details: {
        metadata: {
          reason: 'Host accessing sensitive feature without 2FA',
          route: req.path
        }
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      severity: 'medium'
    });

    // Ne pas bloquer, juste avertir dans la réponse
    req.warningMessage = '⚠️ Activez la 2FA pour sécuriser votre compte hôte';
  }

  // Si 2FA activée, vérifier qu'elle est validée
  if (user.twoFactorEnabled && !req.session?.twoFactorVerified) {
    return res.status(403).json({
      error: '2FA_REQUIRED',
      message: 'Veuillez vérifier votre code 2FA',
      twoFactorEnabled: true,
      requiresVerification: true
    });
  }

  next();
};

/**
 * Force 2FA pour actions critiques spécifiques
 * Même si user n'a pas activé 2FA, on demande un code OTP par email
 * @param {Object} req
 * @param {Object} res
 * @param {Function} next
 */
const requireVerificationForCriticalAction = async (req, res, next) => {
  const user = req.user;

  // Si 2FA activée, utiliser TOTP
  if (user.twoFactorEnabled) {
    if (!req.session?.twoFactorVerified) {
      return res.status(403).json({
        error: '2FA_REQUIRED',
        message: 'Cette action nécessite une vérification 2FA',
        verificationType: 'TOTP'
      });
    }
    return next();
  }

  // Pas de 2FA = demander OTP par email
  if (!req.session?.emailOTPVerified) {
    return res.status(403).json({
      error: 'EMAIL_OTP_REQUIRED',
      message: 'Cette action nécessite une vérification par email',
      verificationType: 'EMAIL_OTP',
      hint: 'Un code de vérification sera envoyé à votre email'
    });
  }

  next();
};

/**
 * Marquer la session comme vérifiée 2FA
 * Appelé après succès de vérification TOTP ou backup code
 * @param {Object} req
 */
const mark2FAVerified = (req) => {
  if (req.session) {
    req.session.twoFactorVerified = true;
    req.session.twoFactorVerifiedAt = Date.now();
  }
};

/**
 * Marquer la session comme vérifiée Email OTP
 * Appelé après succès de vérification code email
 * @param {Object} req
 */
const markEmailOTPVerified = (req) => {
  if (req.session) {
    req.session.emailOTPVerified = true;
    req.session.emailOTPVerifiedAt = Date.now();
  }
};

/**
 * Reset les vérifications de session
 * À appeler lors de logout ou après changement de password
 * @param {Object} req
 */
const reset2FASession = (req) => {
  if (req.session) {
    req.session.twoFactorVerified = false;
    req.session.emailOTPVerified = false;
    req.session.twoFactorVerifiedAt = null;
    req.session.emailOTPVerifiedAt = null;
  }
};

module.exports = {
  require2FA,
  requireHost2FA,
  requireVerificationForCriticalAction,
  mark2FAVerified,
  markEmailOTPVerified,
  reset2FASession
};
