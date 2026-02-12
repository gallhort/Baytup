/**
 * XSS Sanitization Middleware
 * Sanitizes user input to prevent XSS attacks
 */

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return str;

  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Recursively sanitize an object
 * @param {any} obj - Object to sanitize
 * @returns {any} Sanitized object
 */
function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return escapeHtml(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized = {};
    for (const key of Object.keys(obj)) {
      // Skip sanitizing certain fields that may contain valid HTML or special chars
      const skipFields = ['password', 'token', 'signature', 'hash', 'secret', 'url', 'avatar', 'image', 'path'];
      if (skipFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = obj[key];
      } else {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Express middleware to sanitize request body, query, and params
 */
function sanitizeInput(req, res, next) {
  // Skip sanitization for certain routes (like webhooks that need raw data)
  const skipRoutes = ['/api/webhooks'];
  if (skipRoutes.some(route => req.path.startsWith(route))) {
    return next();
  }

  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  // Sanitize URL parameters
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }

  next();
}

module.exports = { sanitizeInput, escapeHtml, sanitizeObject };
