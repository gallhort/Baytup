const featureFlagCache = require('../services/featureFlagCache');

/**
 * Middleware to attach feature flags to all requests
 * Makes flags available as req.features
 */
const injectFeatureFlags = async (req, res, next) => {
  try {
    const flags = await featureFlagCache.getFlags();
    req.features = flags.features;
    next();
  } catch (error) {
    console.error('Error loading feature flags:', error);
    // Don't block request - use safe defaults
    req.features = {
      vehiclesEnabled: true,
      accommodationsEnabled: true
    };
    next();
  }
};

/**
 * Middleware to block vehicle endpoints when feature is disabled
 * Usage: router.get('/vehicles', blockIfDisabled('vehiclesEnabled'), handler)
 */
const blockIfDisabled = (featureName) => {
  return (req, res, next) => {
    if (!req.features || req.features[featureName] === false) {
      return res.status(403).json({
        status: 'error',
        message: 'This feature is currently disabled',
        code: 'FEATURE_DISABLED'
      });
    }
    next();
  };
};

/**
 * Middleware specifically for blocking vehicle-related requests
 */
const requireVehiclesEnabled = (req, res, next) => {
  if (!req.features || req.features.vehiclesEnabled === false) {
    return res.status(403).json({
      status: 'error',
      message: 'Vehicle rentals are currently unavailable',
      code: 'VEHICLES_DISABLED'
    });
  }
  next();
};

module.exports = {
  injectFeatureFlags,
  blockIfDisabled,
  requireVehiclesEnabled
};
