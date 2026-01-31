const express = require('express');
const router = express.Router();
const Dispute = require('../models/Dispute');
const Booking = require('../models/Booking');
const Escrow = require('../models/Escrow');
const { protect } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const disputeEmailService = require('../services/disputeEmailService');
const escrowService = require('../services/escrowService');

// Configure multer for evidence upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/disputes');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error, uploadPath);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'evidence-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    // Allow images and PDFs
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and PDF documents are allowed'));
    }
  }
});

/**
 * @desc    Create a dispute
 * @route   POST /api/disputes
 * @access  Private
 */
router.post('/', protect, async (req, res) => {
  try {
    const { bookingId, reason, description, evidence } = req.body;
    
    if (!bookingId || !reason || !description) {
      return res.status(400).json({
        success: false,
        message: 'Please provide bookingId, reason, and description'
      });
    }
    
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    const isHost = booking.host.toString() === req.user._id.toString();
    const isGuest = booking.guest.toString() === req.user._id.toString();
    
    if (!isHost && !isGuest) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create dispute for this booking'
      });
    }
    
    const existingDispute = await Dispute.findOne({
      booking: bookingId,
      status: { $in: ['open', 'pending'] }
    });
    
    if (existingDispute) {
      return res.status(400).json({
        success: false,
        message: 'An open dispute already exists for this booking'
      });
    }
    
    const dispute = await Dispute.create({
      booking: bookingId,
      reportedBy: req.user._id,
      reason,
      description,
      evidence: evidence || [],
      status: 'open',
      priority: 'medium'
    });

    // ✅ POPULATE COMPLET
    await dispute.populate([
      {
        path: 'booking',
        populate: [
          { path: 'listing', select: 'title address' },
          { path: 'guest', select: 'firstName lastName email' },
          { path: 'host', select: 'firstName lastName email' }
        ]
      },
      { path: 'reportedBy', select: 'firstName lastName email role' }
    ]);

    // 🔒 FREEZE ESCROW IMMÉDIATEMENT (CRITIQUE)
    // Chercher escrow lié à cette réservation
    const escrow = await Escrow.findOne({
      booking: bookingId,
      status: { $in: ['held', 'pending_release'] }
    });

    if (escrow && escrow.status !== 'frozen') {
      try {
        await escrowService.freezeEscrow(escrow._id, dispute._id);
        console.log(`✅ Escrow ${escrow._id} frozen immediately due to dispute ${dispute._id}`);
      } catch (freezeError) {
        console.error('⚠️ Failed to freeze escrow immediately:', freezeError);
        // Ne pas bloquer la création du dispute si le freeze échoue
      }
    } else if (!escrow) {
      console.log(`ℹ️ No escrow found for booking ${bookingId} (may not have been created yet)`);
    }

    // 📧 Send email notifications
    disputeEmailService.sendDisputeCreatedNotification(dispute, dispute.booking)
      .catch(err => console.error('Email notification error:', err));

    res.status(201).json({
      success: true,
      data: { dispute }
    });
  } catch (error) {
    console.error('Error creating dispute:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating dispute'
    });
  }
});

/**
 * @desc    Get all disputes for user (or all for admin)
 * @route   GET /api/disputes
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const { status, priority, page = 1, limit = 10 } = req.query;
    
    // ✅ Build query - Admin voit TOUS les litiges
    let query = {};
    
    if (req.user.role !== 'admin') {
      query.reportedBy = req.user._id;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (priority) {
      query.priority = priority;
    }
    
    // ✅ POPULATE COMPLET
    const disputes = await Dispute.find(query)
      .populate({
        path: 'booking',
        populate: [
          { path: 'listing', select: 'title address' },
          { path: 'guest', select: 'firstName lastName email' },
          { path: 'host', select: 'firstName lastName email' }
        ]
      })
      .populate('reportedBy', 'firstName lastName email role')
      .populate('resolvedBy', 'firstName lastName')
      .populate('notes.user', 'firstName lastName')
      .sort('-createdAt')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Dispute.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: {
        disputes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching disputes:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching disputes'
    });
  }
});

/**
 * @desc    Get dispute analytics (Admin only)
 * @route   GET /api/disputes/analytics
 * @access  Private/Admin
 */
router.get('/analytics', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view analytics'
      });
    }

    // Total disputes
    const totalDisputes = await Dispute.countDocuments();

    // Disputes by status
    const disputesByStatus = await Dispute.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Disputes by priority
    const disputesByPriority = await Dispute.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    // Top reasons
    const topReasons = await Dispute.aggregate([
      { $group: { _id: '$reason', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Resolution rate
    const resolvedCount = await Dispute.countDocuments({ status: 'resolved' });
    const resolutionRate = totalDisputes > 0 ? ((resolvedCount / totalDisputes) * 100).toFixed(1) : 0;

    // Average resolution time (in days)
    const resolvedDisputes = await Dispute.find({
      status: 'resolved',
      resolvedAt: { $exists: true }
    }).select('createdAt resolvedAt');

    let avgResolutionTime = 0;
    if (resolvedDisputes.length > 0) {
      const totalTime = resolvedDisputes.reduce((sum, dispute) => {
        const time = (new Date(dispute.resolvedAt) - new Date(dispute.createdAt)) / (1000 * 60 * 60 * 24);
        return sum + time;
      }, 0);
      avgResolutionTime = (totalTime / resolvedDisputes.length).toFixed(1);
    }

    // Disputes per month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const disputesTrend = await Dispute.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Repeat offenders (users with multiple disputes)
    const repeatOffenders = await Dispute.aggregate([
      { $group: { _id: '$reportedBy', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 1,
          count: 1,
          'user.firstName': 1,
          'user.lastName': 1,
          'user.email': 1,
          'user.role': 1
        }
      }
    ]);

    // Guest vs Host disputes
    const disputesByReporter = await Dispute.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'reportedBy',
          foreignField: '_id',
          as: 'reporter'
        }
      },
      { $unwind: '$reporter' },
      { $group: { _id: '$reporter.role', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalDisputes,
          resolvedCount,
          resolutionRate: parseFloat(resolutionRate),
          avgResolutionTime: parseFloat(avgResolutionTime)
        },
        disputesByStatus,
        disputesByPriority,
        topReasons,
        disputesTrend,
        repeatOffenders,
        disputesByReporter
      }
    });
  } catch (error) {
    console.error('Error fetching dispute analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching analytics'
    });
  }
});

/**
 * @desc    Get single dispute
 * @route   GET /api/disputes/:id
 * @access  Private
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id)
      .populate({
        path: 'booking',
        populate: [
          { path: 'listing', select: 'title address images' },
          { path: 'guest', select: 'firstName lastName email avatar' },
          { path: 'host', select: 'firstName lastName email avatar' }
        ]
      })
      .populate('reportedBy', 'firstName lastName email role')
      .populate('resolvedBy', 'firstName lastName')
      .populate('notes.user', 'firstName lastName');
    
    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: 'Dispute not found'
      });
    }
    
    // ✅ Vérifier autorisation
    const booking = dispute.booking;
    const isHost = booking.host && booking.host._id.toString() === req.user._id.toString();
    const isGuest = booking.guest && booking.guest._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isHost && !isGuest && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this dispute'
      });
    }
    
    res.status(200).json({
      success: true,
      data: { dispute }
    });
  } catch (error) {
    console.error('Error fetching dispute:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching dispute'
    });
  }
});

/**
 * @desc    Add note to dispute
 * @route   POST /api/disputes/:id/notes
 * @access  Private
 */
router.post('/:id/notes', protect, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a message'
      });
    }
    
    const dispute = await Dispute.findById(req.params.id);
    
    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: 'Dispute not found'
      });
    }
    
    // ✅ Add note
    dispute.notes.push({
      user: req.user._id,
      message,
      createdAt: new Date()
    });
    
    await dispute.save();
    
    // ✅ POPULATE COMPLET après save
    await dispute.populate([
      {
        path: 'booking',
        populate: [
          { path: 'listing', select: 'title address' },
          { path: 'guest', select: 'firstName lastName email' },
          { path: 'host', select: 'firstName lastName email' }
        ]
      },
      { path: 'reportedBy', select: 'firstName lastName email role' },
      { path: 'resolvedBy', select: 'firstName lastName' },
      { path: 'notes.user', select: 'firstName lastName' }
    ]);

    // 📧 Send email notification for new note
    const lastNote = dispute.notes[dispute.notes.length - 1];
    disputeEmailService.sendNoteAddedNotification(dispute, lastNote)
      .catch(err => console.error('Email notification error:', err));

    res.status(200).json({
      success: true,
      data: { dispute }
    });
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({
      success: false,
      message: 'Server error adding note',
      error: error.message
    });
  }
});

/**
 * @desc    Upload evidence for dispute
 * @route   POST /api/disputes/:id/evidence
 * @access  Private
 */
router.post('/:id/evidence', protect, upload.array('files', 5), async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id)
      .populate('booking');

    if (!dispute) {
      // Clean up uploaded files
      if (req.files) {
        for (const file of req.files) {
          await fs.unlink(file.path).catch(console.error);
        }
      }
      return res.status(404).json({
        success: false,
        message: 'Dispute not found'
      });
    }

    // Verify authorization
    const booking = dispute.booking;
    const isHost = booking.host && booking.host.toString() === req.user._id.toString();
    const isGuest = booking.guest && booking.guest.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isHost && !isGuest && !isAdmin) {
      // Clean up uploaded files
      if (req.files) {
        for (const file of req.files) {
          await fs.unlink(file.path).catch(console.error);
        }
      }
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add evidence to this dispute'
      });
    }

    // Add evidence to dispute
    const evidenceItems = req.files.map(file => ({
      type: file.mimetype.startsWith('image/') ? 'photo' : 'document',
      url: `/uploads/disputes/${file.filename}`,
      description: req.body.description || file.originalname,
      uploadedBy: req.user._id,
      uploadedAt: new Date()
    }));

    dispute.evidence.push(...evidenceItems);
    await dispute.save();

    res.status(200).json({
      success: true,
      message: `${evidenceItems.length} evidence file(s) uploaded`,
      data: { evidence: evidenceItems }
    });
  } catch (error) {
    console.error('Error uploading evidence:', error);
    // Clean up uploaded files on error
    if (req.files) {
      for (const file of req.files) {
        await fs.unlink(file.path).catch(console.error);
      }
    }
    res.status(500).json({
      success: false,
      message: 'Server error uploading evidence',
      error: error.message
    });
  }
});

/**
 * @desc    Resolve dispute (Admin only)
 * @route   PATCH /api/disputes/:id/resolve
 * @access  Private/Admin
 */
router.patch('/:id/resolve', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can resolve disputes'
      });
    }
    
    // ✅ Accepter resolution OU resolutionText
    const resolution = req.body.resolution || req.body.resolutionText;
    
    if (!resolution) {
      return res.status(400).json({
        success: false,
        message: 'Please provide resolution details'
      });
    }
    
    const dispute = await Dispute.findById(req.params.id);
    
    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: 'Dispute not found'
      });
    }
    
    dispute.status = 'resolved';
    dispute.resolution = resolution;
    dispute.resolvedBy = req.user._id;
    dispute.resolvedAt = new Date();
    
    await dispute.save();
    
    // ✅ POPULATE après save
    await dispute.populate([
      {
        path: 'booking',
        populate: [
          { path: 'listing', select: 'title address' },
          { path: 'guest', select: 'firstName lastName email' },
          { path: 'host', select: 'firstName lastName email' }
        ]
      },
      { path: 'reportedBy', select: 'firstName lastName email role' },
      { path: 'resolvedBy', select: 'firstName lastName' },
      { path: 'notes.user', select: 'firstName lastName' }
    ]);

    // 📧 CRITIQUE: Send resolution notification email
    disputeEmailService.sendDisputeResolvedNotification(dispute, dispute.booking)
      .catch(err => console.error('Email notification error (resolution):', err));

    res.status(200).json({
      success: true,
      data: { dispute }
    });
  } catch (error) {
    console.error('Error resolving dispute:', error);
    res.status(500).json({
      success: false,
      message: 'Server error resolving dispute'
    });
  }
});

module.exports = router;