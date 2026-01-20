const express = require('express');
const router = express.Router();
const {
  handleSlickPayWebhook,
  testWebhook
} = require('../controllers/webhookController');
const { protect } = require('../middleware/auth');

/**
 * Slick Pay webhook endpoint
 * This is a public endpoint that Slick Pay will call
 * No authentication required
 */
router.post('/slickpay', handleSlickPayWebhook);

/**
 * Test webhook endpoint (protected, for development only)
 * Should be disabled or removed in production
 */
if (process.env.NODE_ENV !== 'production') {
  router.post('/test', protect, testWebhook);
}

module.exports = router;
