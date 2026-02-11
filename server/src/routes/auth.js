const express = require('express');
const {
  register,
  login,
  googleAuth,
  logout,
  getMe,
  updateDetails,
  updatePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  registerValidation,
  loginValidation,
  updatePasswordValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  validate
} = require('../utils/validation');

const router = express.Router();

// Public routes
router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.post('/google', googleAuth);
router.post('/forgotpassword', forgotPasswordValidation, validate, forgotPassword);
router.put('/resetpassword/:resettoken', resetPasswordValidation, validate, resetPassword);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerification);

// Protected routes
router.get('/me', protect, getMe);
router.get('/logout', protect, logout);
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePasswordValidation, validate, updatePassword);

// Test route - dev only (P1 #31)
if (process.env.NODE_ENV !== 'production') {
  router.get('/test', (req, res) => {
    res.json({
      status: 'success',
      message: 'Auth routes working',
      timestamp: new Date().toISOString()
    });
  });
}

module.exports = router;
