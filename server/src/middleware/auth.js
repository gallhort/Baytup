const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes
const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Make sure token exists
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token (exclude sensitive fields)
      req.user = await User.findById(decoded.id).select('-password -twoFactorSecret -backupCodes -passwordResetToken -passwordResetExpires');

      if (!req.user) {
        return res.status(401).json({
          status: 'error',
          message: 'User not found'
        });
      }

      // Check if user is active
      if (!req.user.isActive) {
        return res.status(401).json({
          status: 'error',
          message: 'Your account has been deactivated'
        });
      }

      // Update last active
      req.user.updateLastActive();

      next();
    } catch (error) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authorized to access this route'
      });
    }
  } catch (error) {
    next(error);
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Check if user is host or admin
const hostOrAdmin = (req, res, next) => {
  if (!['host', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      status: 'error',
      message: 'Access denied. Host or admin role required.'
    });
  }
  next();
};

// Check if user owns resource or is admin
const ownerOrAdmin = (model) => {
  return async (req, res, next) => {
    try {
      const resource = await model.findById(req.params.id);

      if (!resource) {
        return res.status(404).json({
          status: 'error',
          message: 'Resource not found'
        });
      }

      // Check if user is admin or owns the resource
      if (req.user.role === 'admin' ||
          resource.user?.toString() === req.user.id ||
          resource.host?.toString() === req.user.id ||
          resource.guest?.toString() === req.user.id) {
        req.resource = resource;
        next();
      } else {
        return res.status(403).json({
          status: 'error',
          message: 'Not authorized to access this resource'
        });
      }
    } catch (error) {
      next(error);
    }
  };
};

// Optional auth - doesn't require authentication but provides user if authenticated
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');

        if (req.user && req.user.isActive) {
          req.user.updateLastActive();
        }
      } catch (error) {
        // Invalid token, but continue without user
        req.user = null;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  protect,
  authenticate: protect, // Alias for 2FA routes
  authorize,
  hostOrAdmin,
  ownerOrAdmin,
  optionalAuth
};