const PlatformSettings = require('../models/PlatformSettings');

/**
 * @desc    Get all platform settings
 * @route   GET /api/admin/settings
 * @access  Admin
 */
const getAllSettings = async (req, res) => {
  try {
    const { category } = req.query;

    const query = category ? { category } : {};
    const settings = await PlatformSettings.find(query)
      .populate('updatedBy', 'firstName lastName email')
      .sort({ category: 1, key: 1 });

    // Group by category for easier frontend display
    const grouped = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push({
        key: setting.key,
        value: setting.value,
        valueType: setting.valueType,
        description: setting.description,
        minValue: setting.minValue,
        maxValue: setting.maxValue,
        updatedAt: setting.updatedAt,
        updatedBy: setting.updatedBy
      });
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        settings,
        grouped
      }
    });
  } catch (error) {
    console.error('Error fetching platform settings:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des paramètres'
    });
  }
};

/**
 * @desc    Get commission rates only
 * @route   GET /api/admin/settings/commissions
 * @access  Admin
 */
const getCommissionRates = async (req, res) => {
  try {
    const rates = await PlatformSettings.getCommissionRates();

    res.json({
      success: true,
      data: {
        rates,
        formatted: {
          default: `${(rates.default * 100).toFixed(0)}%`,
          stay: `${(rates.stay * 100).toFixed(0)}%`,
          vehicle: `${(rates.vehicle * 100).toFixed(0)}%`,
          luxury: `${(rates.luxury * 100).toFixed(0)}%`
        }
      }
    });
  } catch (error) {
    console.error('Error fetching commission rates:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des taux de commission'
    });
  }
};

/**
 * @desc    Update a single setting
 * @route   PUT /api/admin/settings/:key
 * @access  Admin
 */
const updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value, reason } = req.body;

    // Get current setting
    const setting = await PlatformSettings.findOne({ key });

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: `Paramètre "${key}" non trouvé`
      });
    }

    // Validate value based on type
    let parsedValue = value;

    if (setting.valueType === 'percentage' || setting.valueType === 'number') {
      parsedValue = parseFloat(value);

      if (isNaN(parsedValue)) {
        return res.status(400).json({
          success: false,
          message: 'La valeur doit être un nombre'
        });
      }

      // Check min/max constraints
      if (setting.minValue !== undefined && parsedValue < setting.minValue) {
        return res.status(400).json({
          success: false,
          message: `La valeur minimum est ${setting.minValue}`
        });
      }

      if (setting.maxValue !== undefined && parsedValue > setting.maxValue) {
        return res.status(400).json({
          success: false,
          message: `La valeur maximum est ${setting.maxValue}`
        });
      }
    } else if (setting.valueType === 'boolean') {
      parsedValue = value === true || value === 'true';
    }

    // Update setting with history
    const updatedSetting = await PlatformSettings.setValue(
      key,
      parsedValue,
      req.user._id,
      reason
    );

    console.log(`[PlatformSettings] ${key} updated to ${parsedValue} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Paramètre mis à jour',
      data: {
        key: updatedSetting.key,
        value: updatedSetting.value,
        previousValue: updatedSetting.history[updatedSetting.history.length - 1]?.previousValue
      }
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du paramètre'
    });
  }
};

/**
 * @desc    Bulk update commission rates
 * @route   PUT /api/admin/settings/commissions
 * @access  Admin
 */
const updateCommissionRates = async (req, res) => {
  try {
    const { rates, reason } = req.body;

    // rates should be like { default: 0.20, stay: 0.20, vehicle: 0.15, luxury: 0.25 }
    if (!rates || typeof rates !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Format de taux invalide'
      });
    }

    const updates = [];
    const errors = [];

    for (const [category, rate] of Object.entries(rates)) {
      const key = `commission_${category}`;
      const parsedRate = parseFloat(rate);

      // Validate rate
      if (isNaN(parsedRate) || parsedRate < 0 || parsedRate > 1) {
        errors.push(`${category}: taux invalide (doit être entre 0 et 1)`);
        continue;
      }

      const updated = await PlatformSettings.setValue(
        key,
        parsedRate,
        req.user._id,
        reason || `Mise à jour groupée des commissions`
      );

      if (updated) {
        updates.push({
          category,
          rate: parsedRate,
          formatted: `${(parsedRate * 100).toFixed(0)}%`
        });
      }
    }

    console.log(`[PlatformSettings] Commission rates updated by ${req.user.email}:`, updates);

    res.json({
      success: true,
      message: `${updates.length} taux de commission mis à jour`,
      data: { updates, errors }
    });
  } catch (error) {
    console.error('Error updating commission rates:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour des commissions'
    });
  }
};

/**
 * @desc    Get setting history
 * @route   GET /api/admin/settings/:key/history
 * @access  Admin
 */
const getSettingHistory = async (req, res) => {
  try {
    const { key } = req.params;

    const setting = await PlatformSettings.findOne({ key })
      .populate('history.changedBy', 'firstName lastName email');

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: `Paramètre "${key}" non trouvé`
      });
    }

    res.json({
      success: true,
      data: {
        key: setting.key,
        currentValue: setting.value,
        history: setting.history.slice(-20).reverse() // Last 20 changes, newest first
      }
    });
  } catch (error) {
    console.error('Error fetching setting history:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique'
    });
  }
};

/**
 * @desc    Initialize default settings (run once on setup)
 * @route   POST /api/admin/settings/initialize
 * @access  Admin
 */
const initializeSettings = async (req, res) => {
  try {
    await PlatformSettings.initializeDefaults();

    res.json({
      success: true,
      message: 'Paramètres par défaut initialisés'
    });
  } catch (error) {
    console.error('Error initializing settings:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'initialisation des paramètres'
    });
  }
};

/**
 * @desc    Get Stripe Connect hosts overview
 * @route   GET /api/admin/stripe-connect/hosts
 * @access  Admin
 */
const getStripeConnectHosts = async (req, res) => {
  try {
    const User = require('../models/User');
    const { status, page = 1, limit = 20 } = req.query;

    const query = {
      role: 'host',
      'stripeConnect.accountId': { $exists: true, $ne: null }
    };

    if (status) {
      query['stripeConnect.onboardingStatus'] = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [hosts, total] = await Promise.all([
      User.find(query)
        .select('firstName lastName email stripeConnect createdAt')
        .sort({ 'stripeConnect.onboardingCompletedAt': -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    // Get statistics
    const stats = await User.aggregate([
      {
        $match: {
          role: 'host',
          'stripeConnect.accountId': { $exists: true }
        }
      },
      {
        $group: {
          _id: '$stripeConnect.onboardingStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    const statusCounts = stats.reduce((acc, s) => {
      acc[s._id] = s.count;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        hosts,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total
        },
        stats: {
          total,
          completed: statusCounts.completed || 0,
          pending: statusCounts.pending || 0,
          restricted: statusCounts.restricted || 0,
          not_started: statusCounts.not_started || 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching Stripe Connect hosts:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des hôtes Stripe'
    });
  }
};

/**
 * @desc    Get Stripe platform balance
 * @route   GET /api/admin/stripe-connect/balance
 * @access  Admin
 */
const getStripeBalance = async (req, res) => {
  try {
    const stripeService = require('../services/stripeService');

    if (!stripeService.isConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'Stripe non configuré'
      });
    }

    const balance = await stripeService.getPlatformBalance();

    res.json({
      success: true,
      data: balance
    });
  } catch (error) {
    console.error('Error fetching Stripe balance:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du solde Stripe'
    });
  }
};

module.exports = {
  getAllSettings,
  getCommissionRates,
  updateSetting,
  updateCommissionRates,
  getSettingHistory,
  initializeSettings,
  getStripeConnectHosts,
  getStripeBalance
};
