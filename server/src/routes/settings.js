const express = require('express');
const {
  getSettings,
  updatePersonalInfo,
  updateAddress,
  updatePreferences,
  updateNotificationSettings,
  updatePrivacySettings,
  changePassword,
  changeEmail,
  uploadAvatar,
  deleteAvatar,
  deactivateAccount,
  deleteAccount
} = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/auth');
const { uploadAvatar: uploadAvatarMiddleware, validateFileContent, handleUploadError } = require('../middleware/upload');
const SystemSettings = require('../models/SystemSettings');
const featureFlagCache = require('../services/featureFlagCache');

const router = express.Router();

// ===================================
// PUBLIC ROUTES
// ===================================

/**
 * @route   GET /api/settings/feature-flags
 * @desc    Get current feature flags (public, cached)
 * @access  Public
 */
router.get('/feature-flags', async (req, res, next) => {
  try {
    const flags = await featureFlagCache.getFlags();

    res.json({
      status: 'success',
      data: {
        features: flags.features,
        version: flags.version
      }
    });
  } catch (error) {
    next(error);
  }
});

// ===================================
// USER SETTINGS ROUTES (Protected)
// ===================================

// Protect all user settings routes
router.use(protect);

// Settings routes
router.get('/', getSettings);

// Personal information
router.put('/personal-info', updatePersonalInfo);

// Address
router.put('/address', updateAddress);

// Preferences
router.put('/preferences', updatePreferences);

// Notifications
router.put('/notifications', updateNotificationSettings);

// Privacy
router.put('/privacy', updatePrivacySettings);

// Security
router.put('/password', changePassword);
router.put('/email', changeEmail);

// Avatar - Use uploadAvatarMiddleware for proper file handling
router.post('/avatar', uploadAvatarMiddleware.single('avatar'), handleUploadError, validateFileContent, uploadAvatar);
router.delete('/avatar', deleteAvatar);

// Account management
router.put('/deactivate', deactivateAccount);
router.delete('/account', deleteAccount);

// ===================================
// ADMIN SYSTEM SETTINGS ROUTES
// ===================================

/**
 * @route   GET /api/settings/system-settings
 * @desc    Get full system settings including audit trail
 * @access  Admin
 */
router.get('/system-settings', protect, authorize('admin'), async (req, res, next) => {
  try {
    const settings = await SystemSettings.getSettings();

    res.json({
      status: 'success',
      data: { settings }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PATCH /api/settings/system-settings/features/:featureName
 * @desc    Update a feature flag
 * @access  Admin
 */
router.patch('/system-settings/features/:featureName', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { featureName } = req.params;
    const { enabled, reason } = req.body;

    // Validate feature name
    const validFeatures = ['vehiclesEnabled', 'accommodationsEnabled'];
    if (!validFeatures.includes(featureName)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid feature name. Must be one of: ' + validFeatures.join(', ')
      });
    }

    // Validate enabled value
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        status: 'error',
        message: 'enabled must be a boolean value'
      });
    }

    // Get settings and update
    const settings = await SystemSettings.getSettings();
    await settings.updateFeature(featureName, enabled, req.user.id, reason || '');

    // Invalidate cache
    await featureFlagCache.invalidate();

    console.log(`✅ Feature ${featureName} ${enabled ? 'enabled' : 'disabled'} by admin ${req.user.email}`);

    // Broadcast update via Socket.IO (if available)
    const io = req.app.get('socketio');
    if (io) {
      io.emit('feature-flags-updated', {
        feature: featureName,
        enabled,
        version: settings.version,
        updatedBy: {
          id: req.user.id,
          name: `${req.user.firstName} ${req.user.lastName}`
        }
      });
      console.log(`📡 Broadcasted feature-flags-updated event via Socket.IO`);
    }

    res.json({
      status: 'success',
      message: `Feature ${featureName} ${enabled ? 'enabled' : 'disabled'} successfully`,
      data: {
        features: settings.features,
        version: settings.version
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/settings/cache-stats
 * @desc    Get cache statistics (for debugging/monitoring)
 * @access  Admin
 */
router.get('/cache-stats', protect, authorize('admin'), async (req, res) => {
  const stats = featureFlagCache.getStats();
  res.json({
    status: 'success',
    data: { stats }
  });
});

/**
 * @route   POST /api/settings/cache/invalidate
 * @desc    Manually invalidate cache
 * @access  Admin
 */
router.post('/cache/invalidate', protect, authorize('admin'), async (req, res, next) => {
  try {
    const freshFlags = await featureFlagCache.invalidate();

    console.log(`✅ Cache manually invalidated by admin ${req.user.email}`);

    res.json({
      status: 'success',
      message: 'Cache invalidated successfully',
      data: {
        features: freshFlags.features,
        version: freshFlags.version
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
