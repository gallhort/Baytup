const rateLimit = require('express-rate-limit');

// General API rate limiter - 500 requests per 15 minutes
// (Homepage alone fires ~8+ requests per load: listings, city counts, auth check, etc.)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 1000 : 500,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth rate limiter - 10 attempts per 15 minutes (login, register, forgot-password)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many authentication attempts, please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter - 5 requests per hour (password reset, verification emails)
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many attempts, please try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Upload rate limiter - 20 uploads per hour
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Too many uploads, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Search rate limiter - 120 requests per minute
// (Homepage fires ~8 listing requests at once: main search + 6 city counts + featured)
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 200 : 120,
  message: { error: 'Too many search requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Webhook rate limiter - 100 per minute (generous for payment providers)
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many webhook calls.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  authLimiter,
  strictLimiter,
  uploadLimiter,
  searchLimiter,
  webhookLimiter
};
