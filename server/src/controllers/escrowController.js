const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');
const Escrow = require('../models/Escrow');
const Booking = require('../models/Booking');
const escrowService = require('../services/escrowService');

/**
 * Get escrow details for a booking
 * @route GET /api/escrow/booking/:bookingId
 * @access Private (guest or host of the booking)
 */
exports.getBookingEscrow = catchAsync(async (req, res, next) => {
  const { bookingId } = req.params;

  // Verify booking exists and user has access
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  // Check if user is guest or host of the booking
  const isGuest = booking.guest.toString() === req.user.id.toString();
  const isHost = booking.host.toString() === req.user.id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isGuest && !isHost && !isAdmin) {
    return next(new AppError('You do not have permission to view this escrow', 403));
  }

  const escrow = await escrowService.getEscrowStatus(bookingId);

  if (!escrow) {
    return res.status(200).json({
      status: 'success',
      data: {
        escrow: null,
        message: 'No escrow record found for this booking'
      }
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      escrow
    }
  });
});

/**
 * Get all escrows (admin only)
 * @route GET /api/escrow/admin/all
 * @access Admin
 */
exports.getAllEscrows = catchAsync(async (req, res, next) => {
  const { status, currency, page = 1, limit = 20 } = req.query;

  const filters = {};
  if (status) filters.status = status;
  if (currency) filters.currency = currency;

  const escrows = await escrowService.getAllEscrows(filters);

  // Paginate results
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedEscrows = escrows.slice(startIndex, endIndex);

  res.status(200).json({
    status: 'success',
    results: escrows.length,
    data: {
      escrows: paginatedEscrows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: escrows.length,
        pages: Math.ceil(escrows.length / limit)
      }
    }
  });
});

/**
 * Get escrow statistics (admin only)
 * @route GET /api/escrow/admin/stats
 * @access Admin
 */
exports.getEscrowStats = catchAsync(async (req, res, next) => {
  const stats = await Escrow.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        avgAmount: { $avg: '$amount' }
      }
    }
  ]);

  const currencyStats = await Escrow.aggregate([
    {
      $group: {
        _id: '$currency',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        heldAmount: {
          $sum: {
            $cond: [{ $eq: ['$status', 'held'] }, '$amount', 0]
          }
        },
        releasedAmount: {
          $sum: {
            $cond: [{ $eq: ['$status', 'released'] }, '$breakdown.hostAmount', 0]
          }
        }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      byStatus: stats,
      byCurrency: currencyStats
    }
  });
});

/**
 * Manual release of escrow (admin only)
 * @route POST /api/escrow/admin/:id/release
 * @access Admin
 */
exports.manualRelease = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { notes } = req.body;

  const escrow = await Escrow.findById(id);
  if (!escrow) {
    return next(new AppError('Escrow not found', 404));
  }

  if (!['held', 'frozen'].includes(escrow.status)) {
    return next(new AppError(`Cannot release escrow with status: ${escrow.status}`, 400));
  }

  // Add admin note to history before release
  if (notes) {
    escrow.addHistory('released', {
      performedBy: req.user.id,
      note: `Manual release by admin. Notes: ${notes}`
    });
    await escrow.save();
  }

  const updatedEscrow = await escrowService.releaseFunds(escrow, 'manual', req.user.id);

  res.status(200).json({
    status: 'success',
    message: 'Escrow released successfully',
    data: {
      escrow: updatedEscrow
    }
  });
});

/**
 * Freeze escrow manually (admin only)
 * @route POST /api/escrow/admin/:id/freeze
 * @access Admin
 */
exports.freezeEscrow = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason) {
    return next(new AppError('Please provide a reason for freezing', 400));
  }

  const escrow = await Escrow.findById(id);
  if (!escrow) {
    return next(new AppError('Escrow not found', 404));
  }

  if (escrow.status !== 'held') {
    return next(new AppError(`Cannot freeze escrow with status: ${escrow.status}`, 400));
  }

  // Create a pseudo-dispute for manual freeze
  escrow.status = 'frozen';
  escrow.frozenAt = new Date();
  escrow.addHistory('frozen', {
    performedBy: req.user.id,
    note: `Manually frozen by admin. Reason: ${reason}`
  });

  await escrow.save();

  res.status(200).json({
    status: 'success',
    message: 'Escrow frozen successfully',
    data: {
      escrow
    }
  });
});

/**
 * Resolve dispute and split escrow (admin only)
 * @route POST /api/escrow/admin/:id/resolve
 * @access Admin
 */
exports.resolveDispute = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { hostPortion, guestPortion, notes } = req.body;

  // Validate input
  if (hostPortion === undefined || guestPortion === undefined) {
    return next(new AppError('Please provide hostPortion and guestPortion', 400));
  }

  if (hostPortion < 0 || guestPortion < 0) {
    return next(new AppError('Portions cannot be negative', 400));
  }

  const escrow = await Escrow.findById(id);
  if (!escrow) {
    return next(new AppError('Escrow not found', 404));
  }

  if (!['frozen', 'held'].includes(escrow.status)) {
    return next(new AppError(`Cannot resolve escrow with status: ${escrow.status}`, 400));
  }

  // Validate total doesn't exceed available amount
  const maxAmount = escrow.breakdown.hostAmount;
  if (hostPortion + guestPortion > maxAmount) {
    return next(new AppError(`Total split (${hostPortion + guestPortion}) exceeds available amount (${maxAmount})`, 400));
  }

  const updatedEscrow = await escrowService.resolveDispute(escrow, {
    hostPortion,
    guestPortion,
    resolvedBy: req.user.id,
    notes
  });

  res.status(200).json({
    status: 'success',
    message: 'Dispute resolved successfully',
    data: {
      escrow: updatedEscrow,
      resolution: {
        hostReceives: hostPortion,
        guestRefund: guestPortion,
        currency: escrow.currency
      }
    }
  });
});

/**
 * Request refund (guest only)
 * This opens a dispute and freezes the escrow
 * @route POST /api/escrow/:id/request-refund
 * @access Private (guest only)
 */
exports.requestRefund = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { reason, description } = req.body;

  if (!reason || !description) {
    return next(new AppError('Please provide reason and description', 400));
  }

  const escrow = await Escrow.findById(id).populate('booking');
  if (!escrow) {
    return next(new AppError('Escrow not found', 404));
  }

  // Verify user is the payer (guest)
  if (escrow.payer.toString() !== req.user.id.toString()) {
    return next(new AppError('Only the guest can request a refund', 403));
  }

  if (escrow.status !== 'held') {
    return next(new AppError(`Cannot request refund for escrow with status: ${escrow.status}`, 400));
  }

  // Create a dispute
  const Dispute = require('../models/Dispute');
  const dispute = await Dispute.create({
    booking: escrow.booking._id,
    reportedBy: req.user.id,
    reason: reason,
    description: description,
    status: 'open',
    priority: 'medium'
  });

  // Freeze the escrow
  await escrowService.freezeEscrow(escrow, dispute);

  res.status(201).json({
    status: 'success',
    message: 'Refund request submitted. Our team will review your case.',
    data: {
      dispute,
      escrow: await Escrow.findById(id)
    }
  });
});

/**
 * Get escrow by ID (admin only)
 * @route GET /api/escrow/admin/:id
 * @access Admin
 */
exports.getEscrowById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const escrow = await Escrow.findById(id)
    .populate('booking')
    .populate('payer', 'firstName lastName email phone')
    .populate('payee', 'firstName lastName email phone bankAccount')
    .populate('dispute')
    .populate('payout')
    .populate('history.performedBy', 'firstName lastName')
    .populate('releasedBy', 'firstName lastName')
    .populate('disputeResolution.resolvedBy', 'firstName lastName');

  if (!escrow) {
    return next(new AppError('Escrow not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      escrow
    }
  });
});
