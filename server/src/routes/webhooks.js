const express = require('express');
const router = express.Router();
const {
  handleSlickPayWebhook,
  handleChargilyWebhook,
  handleStripeWebhook,
  testWebhook
} = require('../controllers/webhookController');
const { protect } = require('../middleware/auth');

/**
 * Middleware to capture raw body for webhook signature verification
 */
const captureRawBody = express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
});

/**
 * Chargily Pay webhook endpoint
 * This is a public endpoint that Chargily will call
 * Requires raw body for signature verification
 */
router.post('/chargily', captureRawBody, handleChargilyWebhook);

/**
 * Slick Pay webhook endpoint (DEPRECATED - kept for backward compatibility)
 * This is a public endpoint that Slick Pay will call
 * No authentication required
 */
router.post('/slickpay', handleSlickPayWebhook);

/**
 * Stripe webhook endpoint
 * IMPORTANT: Stripe requires raw body for signature verification
 * express.raw() middleware is applied at server.js level for /api/webhooks/stripe
 */
router.post('/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

/**
 * Test webhook endpoint (protected, for development only)
 * Should be disabled or removed in production
 */
if (process.env.NODE_ENV !== 'production') {
  router.post('/test', protect, testWebhook);
}

module.exports = router;
