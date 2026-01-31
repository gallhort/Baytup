const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const ModerationRule = require('../models/ModerationRule');
const ModerationLog = require('../models/ModerationLog');
const { Message } = require('../models/Message');
const Review = require('../models/Review');
const moderationService = require('../services/moderationService');

// Middleware to check admin role
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin only.'
    });
  }
  next();
};

// ========================================
// MODERATION LOGS ROUTES
// ========================================

// @desc    Get all moderation logs
// @route   GET /api/moderation/logs
// @access  Private/Admin
router.get('/logs', protect, adminOnly, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      action,
      contentType,
      reviewStatus,
      userId,
      startDate,
      endDate
    } = req.query;

    // Build query
    const query = {};
    if (action) query.action = action;
    if (contentType) query.contentType = contentType;
    if (reviewStatus) query.reviewStatus = reviewStatus;
    if (userId) query.user = userId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    const logs = await ModerationLog.find(query)
      .populate('user', 'firstName lastName email avatar')
      .populate('reviewedBy', 'firstName lastName')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ModerationLog.countDocuments(query);

    res.status(200).json({
      success: true,
      results: logs.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      data: { logs }
    });
  } catch (error) {
    console.error('Error fetching moderation logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching moderation logs',
      error: error.message
    });
  }
});

// @desc    Get single moderation log
// @route   GET /api/moderation/logs/:id
// @access  Private/Admin
router.get('/logs/:id', protect, adminOnly, async (req, res) => {
  try {
    const log = await ModerationLog.findById(req.params.id)
      .populate('user', 'firstName lastName email avatar')
      .populate('reviewedBy', 'firstName lastName')
      .populate('triggeredRules.ruleId');

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Moderation log not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { log }
    });
  } catch (error) {
    console.error('Error fetching moderation log:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching moderation log',
      error: error.message
    });
  }
});

// @desc    Review flagged content (approve/reject)
// @route   PUT /api/moderation/logs/:id/review
// @access  Private/Admin
router.put('/logs/:id/review', protect, adminOnly, async (req, res) => {
  try {
    const { reviewStatus, adminNotes } = req.body;

    if (!['approved', 'rejected', 'ignored'].includes(reviewStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review status'
      });
    }

    const log = await ModerationLog.findByIdAndUpdate(
      req.params.id,
      {
        reviewStatus,
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        adminNotes: adminNotes || ''
      },
      { new: true }
    ).populate('user', 'firstName lastName email');

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Moderation log not found'
      });
    }

    // If rejected, update the actual content (message or review) to hidden/blocked status
    if (reviewStatus === 'rejected' && log.contentId) {
      if (log.contentType === 'message') {
        await Message.findByIdAndUpdate(log.contentId, {
          flagged: true,
          flagReason: 'Rejected by admin',
          moderatedBy: req.user.id
        });
      } else if (log.contentType === 'review') {
        await Review.findByIdAndUpdate(log.contentId, {
          status: 'hidden',
          flagged: true,
          flagReason: 'offensive',
          moderatedBy: req.user.id
        });
      }
    }

    res.status(200).json({
      success: true,
      data: { log }
    });
  } catch (error) {
    console.error('Error reviewing content:', error);
    res.status(500).json({
      success: false,
      message: 'Error reviewing content',
      error: error.message
    });
  }
});

// @desc    Get moderation statistics
// @route   GET /api/moderation/stats
// @access  Private/Admin
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Overall stats
    const totalLogs = await ModerationLog.countDocuments(dateFilter);
    const blockedCount = await ModerationLog.countDocuments({ ...dateFilter, action: 'block' });
    const flaggedCount = await ModerationLog.countDocuments({ ...dateFilter, action: 'flag' });
    const pendingReview = await ModerationLog.countDocuments({ ...dateFilter, reviewStatus: 'pending' });

    // By content type
    const byContentType = await ModerationLog.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$contentType', count: { $sum: 1 } } }
    ]);

    // By action
    const byAction = await ModerationLog.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$action', count: { $sum: 1 } } }
    ]);

    // Top triggered rules
    const topRules = await ModerationLog.aggregate([
      { $match: dateFilter },
      { $unwind: '$triggeredRules' },
      {
        $group: {
          _id: '$triggeredRules.ruleName',
          count: { $sum: 1 },
          category: { $first: '$triggeredRules.category' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Trend over last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trend = await ModerationLog.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalLogs,
          blockedCount,
          flaggedCount,
          pendingReview,
          blockRate: totalLogs > 0 ? ((blockedCount / totalLogs) * 100).toFixed(1) : 0
        },
        byContentType,
        byAction,
        topRules,
        trend
      }
    });
  } catch (error) {
    console.error('Error fetching moderation stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching moderation stats',
      error: error.message
    });
  }
});

// ========================================
// MODERATION RULES ROUTES
// ========================================

// @desc    Get all moderation rules
// @route   GET /api/moderation/rules
// @access  Private/Admin
router.get('/rules', protect, adminOnly, async (req, res) => {
  try {
    const { enabled, category, type, language } = req.query;

    const query = {};
    if (enabled !== undefined) query.enabled = enabled === 'true';
    if (category) query.category = category;
    if (type) query.type = type;
    if (language) query.languages = language;

    const rules = await ModerationRule.find(query).sort('-createdAt');

    res.status(200).json({
      success: true,
      results: rules.length,
      data: { rules }
    });
  } catch (error) {
    console.error('Error fetching moderation rules:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching moderation rules',
      error: error.message
    });
  }
});

// @desc    Get single moderation rule
// @route   GET /api/moderation/rules/:id
// @access  Private/Admin
router.get('/rules/:id', protect, adminOnly, async (req, res) => {
  try {
    const rule = await ModerationRule.findById(req.params.id);

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Moderation rule not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { rule }
    });
  } catch (error) {
    console.error('Error fetching moderation rule:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching moderation rule',
      error: error.message
    });
  }
});

// @desc    Create moderation rule
// @route   POST /api/moderation/rules
// @access  Private/Admin
router.post('/rules', protect, adminOnly, async (req, res) => {
  try {
    const rule = await ModerationRule.create(req.body);

    // Invalidate cache
    moderationService.invalidateCache();

    res.status(201).json({
      success: true,
      data: { rule }
    });
  } catch (error) {
    console.error('Error creating moderation rule:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating moderation rule',
      error: error.message
    });
  }
});

// @desc    Update moderation rule
// @route   PUT /api/moderation/rules/:id
// @access  Private/Admin
router.put('/rules/:id', protect, adminOnly, async (req, res) => {
  try {
    const rule = await ModerationRule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Moderation rule not found'
      });
    }

    // Invalidate cache
    moderationService.invalidateCache();

    res.status(200).json({
      success: true,
      data: { rule }
    });
  } catch (error) {
    console.error('Error updating moderation rule:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating moderation rule',
      error: error.message
    });
  }
});

// @desc    Delete moderation rule
// @route   DELETE /api/moderation/rules/:id
// @access  Private/Admin
router.delete('/rules/:id', protect, adminOnly, async (req, res) => {
  try {
    const rule = await ModerationRule.findByIdAndDelete(req.params.id);

    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Moderation rule not found'
      });
    }

    // Invalidate cache
    moderationService.invalidateCache();

    res.status(200).json({
      success: true,
      message: 'Rule deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting moderation rule:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting moderation rule',
      error: error.message
    });
  }
});

// @desc    Seed default moderation rules
// @route   POST /api/moderation/rules/seed
// @access  Private/Admin
router.post('/rules/seed', protect, adminOnly, async (req, res) => {
  try {
    await moderationService.seedDefaultRules();

    // Invalidate cache
    moderationService.invalidateCache();

    res.status(200).json({
      success: true,
      message: 'Default moderation rules seeded successfully'
    });
  } catch (error) {
    console.error('Error seeding moderation rules:', error);
    res.status(500).json({
      success: false,
      message: 'Error seeding moderation rules',
      error: error.message
    });
  }
});

// ========================================
// FLAGGED CONTENT ROUTES
// ========================================

// @desc    Get all flagged messages
// @route   GET /api/moderation/flagged/messages
// @access  Private/Admin
router.get('/flagged/messages', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;
    const messages = await Message.find({ flagged: true })
      .populate('sender', 'firstName lastName email avatar')
      .populate('conversation', 'subject listing')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Message.countDocuments({ flagged: true });

    res.status(200).json({
      success: true,
      results: messages.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      data: { messages }
    });
  } catch (error) {
    console.error('Error fetching flagged messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching flagged messages',
      error: error.message
    });
  }
});

// @desc    Get all flagged reviews
// @route   GET /api/moderation/flagged/reviews
// @access  Private/Admin
router.get('/flagged/reviews', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;
    const reviews = await Review.find({ flagged: true })
      .populate('reviewer', 'firstName lastName email avatar')
      .populate('reviewee', 'firstName lastName')
      .populate('listing', 'title category')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments({ flagged: true });

    res.status(200).json({
      success: true,
      results: reviews.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      data: { reviews }
    });
  } catch (error) {
    console.error('Error fetching flagged reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching flagged reviews',
      error: error.message
    });
  }
});

module.exports = router;
