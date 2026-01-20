const express = require('express');
const router = express.Router();
const Dispute = require('../models/Dispute');
const Booking = require('../models/Booking');
const { protect } = require('../middleware/auth');

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