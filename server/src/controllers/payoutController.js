const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');
const Payout = require('../models/Payout');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const { sendPayoutRequestEmail, sendPayoutCompletedEmail, sendPayoutRejectedEmail } = require('../utils/emailService');

/**
 * Calculate host earning for a booking
 * Baytup Fee Structure: 8% guest service fee + 3% host commission
 * Host receives: subtotal + cleaningFee - 3% commission
 * @param {Object} booking - The booking document
 * @returns {Number} - The amount host receives after commission
 */
const calculateHostEarning = (booking) => {
  const baseAmount = booking.pricing.subtotal + (booking.pricing.cleaningFee || 0);
  // Use hostPayout if available (new bookings), otherwise calculate with 3% commission
  if (booking.pricing.hostPayout) {
    return booking.pricing.hostPayout;
  }
  const hostCommission = booking.pricing.hostCommission || Math.round(baseAmount * 0.03);
  return baseAmount - hostCommission;
};

// @desc    Request a payout/withdrawal
// @route   POST /api/payouts/request
// @access  Private (Host only)
exports.requestPayout = catchAsync(async (req, res, next) => {
  const hostId = req.user.id;
  const { amount, bankAccount, hostNotes, paymentMethod } = req.body;

  // Validate required fields
  if (!amount || !bankAccount) {
    return next(new AppError('Amount and bank account details are required', 400));
  }

  if (!bankAccount.bankName || !bankAccount.accountHolderName || !bankAccount.accountNumber || !bankAccount.rib) {
    return next(new AppError('Complete bank account details are required', 400));
  }

  // Validate RIB format (20 digits for Algeria)
  if (!/^\d{20}$/.test(bankAccount.rib)) {
    return next(new AppError('RIB must be exactly 20 digits', 400));
  }

  // Get host's available balance (with 3% commission deducted)
  const completedBookings = await Booking.find({
    host: hostId,
    status: 'completed',
    'payment.status': 'paid'
  });

  const availableBalance = completedBookings.reduce((sum, booking) => {
    return sum + calculateHostEarning(booking);
  }, 0);

  // Check if host has already withdrawn this amount
  const previousPayouts = await Payout.find({
    host: hostId,
    status: { $in: ['completed', 'processing', 'pending'] }
  });

  const totalWithdrawn = previousPayouts.reduce((sum, payout) => {
    return sum + payout.amount;
  }, 0);

  const actualAvailable = availableBalance - totalWithdrawn;

  if (amount > actualAvailable) {
    return next(new AppError(`Insufficient balance. Available: ${actualAvailable} DZD`, 400));
  }

  if (amount < 1000) {
    return next(new AppError('Minimum withdrawal amount is 1000 DZD', 400));
  }

  // Create payout request
  const payout = await Payout.create({
    host: hostId,
    amount,
    currency: 'DZD',
    bankAccount: {
      bankName: bankAccount.bankName,
      accountHolderName: bankAccount.accountHolderName,
      accountNumber: bankAccount.accountNumber,
      rib: bankAccount.rib,
      iban: bankAccount.iban || '',
      swiftCode: bankAccount.swiftCode || ''
    },
    paymentMethod: paymentMethod || 'bank_transfer',
    hostNotes: hostNotes || '',
    status: 'pending',
    requestedAt: new Date(),
    estimatedArrival: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days
  });

  // Update user's bank account if they want to save it
  if (req.body.saveBankAccount) {
    await User.findByIdAndUpdate(hostId, {
      bankAccount: {
        bankName: bankAccount.bankName,
        accountHolderName: bankAccount.accountHolderName,
        accountNumber: bankAccount.accountNumber,
        rib: bankAccount.rib,
        iban: bankAccount.iban || '',
        swiftCode: bankAccount.swiftCode || '',
        isVerified: false
      }
    });
  }

  // Populate host details for email
  const populatedPayout = await Payout.findById(payout._id).populate('host', 'firstName lastName email');

  // Send email notifications to host and all admins
  try {
    // Send to host
    await sendPayoutRequestEmail(populatedPayout.host, populatedPayout);

    // Send to all admins
    const admins = await User.find({ role: 'admin', isActive: true });
    for (const admin of admins) {
      await sendPayoutRequestEmail(admin, populatedPayout, true);
    }

    // Mark notifications as sent
    payout.notifications.hostNotified = true;
    payout.notifications.adminNotified = true;
    await payout.save();
  } catch (emailError) {
    console.error('Error sending payout request emails:', emailError);
  }

  // Create in-app notifications
  try {
    // Notification for host
    await Notification.createNotification({
      recipient: hostId,
      type: 'payout_request',
      title: 'Payout Request Submitted',
      message: `Your payout request for ${amount.toLocaleString()} DZD has been submitted successfully. We'll review it within 24-48 hours.`,
      data: {
        payoutId: payout._id,
        amount,
        currency: 'DZD',
        status: 'pending'
      },
      link: '/dashboard/earnings',
      priority: 'high'
    });

    // Notifications for admins
    const admins = await User.find({ role: 'admin', isActive: true });
    for (const admin of admins) {
      await Notification.createNotification({
        recipient: admin._id,
        type: 'payout_request',
        title: 'New Payout Request',
        message: `${populatedPayout.host.firstName} ${populatedPayout.host.lastName} has requested a payout of ${amount.toLocaleString()} DZD.`,
        data: {
          payoutId: payout._id,
          hostId: hostId,
          hostName: `${populatedPayout.host.firstName} ${populatedPayout.host.lastName}`,
          amount,
          currency: 'DZD',
          status: 'pending'
        },
        link: '/dashboard/payouts',
        priority: 'high'
      });
    }
  } catch (notificationError) {
    console.error('Error creating payout notifications:', notificationError);
  }

  res.status(201).json({
    success: true,
    message: 'Payout request submitted successfully',
    data: {
      payout: populatedPayout
    }
  });
});

// @desc    Get host's payout requests
// @route   GET /api/payouts/my-payouts
// @access  Private (Host only)
exports.getMyPayouts = catchAsync(async (req, res, next) => {
  const hostId = req.user.id;
  const { status, page = 1, limit = 20 } = req.query;

  // Build query
  const query = { host: hostId };

  if (status && status !== 'all') {
    query.status = status;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const payouts = await Payout.find(query)
    .populate('processedBy', 'firstName lastName')
    .sort('-requestedAt -createdAt')
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Payout.countDocuments(query);

  // Get summary stats
  const allPayouts = await Payout.find({ host: hostId });
  const stats = {
    totalRequested: allPayouts.length,
    totalAmount: allPayouts.reduce((sum, p) => sum + p.amount, 0),
    completed: allPayouts.filter(p => p.status === 'completed').length,
    pending: allPayouts.filter(p => p.status === 'pending').length,
    processing: allPayouts.filter(p => p.status === 'processing').length,
    rejected: allPayouts.filter(p => p.status === 'rejected').length
  };

  res.status(200).json({
    success: true,
    count: payouts.length,
    data: {
      payouts,
      stats
    },
    pagination: {
      total,
      pages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      limit: parseInt(limit)
    }
  });
});

// @desc    Get all payout requests (Admin only)
// @route   GET /api/payouts/admin/all
// @access  Private (Admin only)
exports.getAllPayouts = catchAsync(async (req, res, next) => {
  const { status, hostId, startDate, endDate, page = 1, limit = 20 } = req.query;

  // Build query
  const query = {};

  if (status && status !== 'all') {
    query.status = status;
  }

  if (hostId) {
    query.host = hostId;
  }

  if (startDate || endDate) {
    query.requestedAt = {};
    if (startDate) {
      query.requestedAt.$gte = new Date(startDate);
    }
    if (endDate) {
      query.requestedAt.$lte = new Date(endDate);
    }
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const payouts = await Payout.find(query)
    .populate('host', 'firstName lastName email avatar')
    .populate('processedBy', 'firstName lastName')
    .sort('-requestedAt -createdAt')
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Payout.countDocuments(query);

  // Get summary stats
  const allPayouts = await Payout.find({});
  const stats = {
    totalRequests: allPayouts.length,
    totalAmount: allPayouts.reduce((sum, p) => sum + p.amount, 0),
    pending: allPayouts.filter(p => p.status === 'pending').length,
    processing: allPayouts.filter(p => p.status === 'processing').length,
    completed: allPayouts.filter(p => p.status === 'completed').length,
    rejected: allPayouts.filter(p => p.status === 'rejected').length,
    pendingAmount: allPayouts.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
    processingAmount: allPayouts.filter(p => p.status === 'processing').reduce((sum, p) => sum + p.amount, 0),
    completedAmount: allPayouts.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0)
  };

  res.status(200).json({
    success: true,
    count: payouts.length,
    data: {
      payouts,
      stats
    },
    pagination: {
      total,
      pages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      limit: parseInt(limit)
    }
  });
});

// @desc    Update payout status (Admin only)
// @route   PUT /api/payouts/admin/:id/status
// @access  Private (Admin only)
exports.updatePayoutStatus = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { status, adminNotes, transactionId, rejectionReason } = req.body;

  if (!['processing', 'completed', 'rejected', 'cancelled'].includes(status)) {
    return next(new AppError('Invalid status', 400));
  }

  const payout = await Payout.findById(id).populate('host', 'firstName lastName email');

  if (!payout) {
    return next(new AppError('Payout request not found', 404));
  }

  if (payout.status === 'completed') {
    return next(new AppError('This payout has already been completed', 400));
  }

  if (payout.status === 'cancelled') {
    return next(new AppError('This payout has been cancelled', 400));
  }

  // Update payout
  payout.status = status;
  payout.processedBy = req.user.id;
  payout.processedAt = new Date();

  if (adminNotes) {
    payout.adminNotes = adminNotes;
  }

  if (transactionId) {
    payout.transactionId = transactionId;
  }

  if (status === 'completed') {
    payout.completedAt = new Date();
  }

  if (status === 'rejected' && rejectionReason) {
    payout.rejectionReason = rejectionReason;
  }

  await payout.save();

  // Send email notification to host
  try {
    if (status === 'completed') {
      await sendPayoutCompletedEmail(payout.host, payout);
      payout.notifications.completionNotified = true;
    } else if (status === 'rejected') {
      await sendPayoutRejectedEmail(payout.host, payout);
    }
    await payout.save();
  } catch (emailError) {
    console.error('Error sending payout status email:', emailError);
  }

  // Create in-app notification for host
  try {
    let notificationData = {
      recipient: payout.host._id,
      sender: req.user.id,
      data: {
        payoutId: payout._id,
        amount: payout.amount,
        currency: payout.currency,
        status: status
      },
      link: '/dashboard/earnings',
      priority: 'high'
    };

    if (status === 'processing') {
      notificationData.type = 'payout_processing';
      notificationData.title = 'Payout Being Processed';
      notificationData.message = `Your payout request for ${payout.amount.toLocaleString()} ${payout.currency} is now being processed. You'll receive the funds within 3-5 business days.`;
    } else if (status === 'completed') {
      notificationData.type = 'payout_completed';
      notificationData.title = 'Payout Completed! 🎉';
      notificationData.message = `Congratulations! Your payout of ${payout.amount.toLocaleString()} ${payout.currency} has been successfully transferred to your bank account.`;
      if (payout.transactionId) {
        notificationData.data.transactionId = payout.transactionId;
      }
    } else if (status === 'rejected') {
      notificationData.type = 'payout_rejected';
      notificationData.title = 'Payout Request Rejected';
      notificationData.message = `Unfortunately, your payout request for ${payout.amount.toLocaleString()} ${payout.currency} has been rejected. ${payout.rejectionReason || 'Please contact support for more information.'}`;
      if (payout.rejectionReason) {
        notificationData.data.rejectionReason = payout.rejectionReason;
      }
    }

    await Notification.createNotification(notificationData);
  } catch (notificationError) {
    console.error('Error creating payout status notification:', notificationError);
  }

  res.status(200).json({
    success: true,
    message: `Payout ${status} successfully`,
    data: {
      payout
    }
  });
});

// @desc    Get payout details
// @route   GET /api/payouts/:id
// @access  Private
exports.getPayoutDetails = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const payout = await Payout.findById(id)
    .populate('host', 'firstName lastName email avatar phone')
    .populate('processedBy', 'firstName lastName email');

  if (!payout) {
    return next(new AppError('Payout request not found', 404));
  }

  // Check if user has permission to view this payout
  if (req.user.role !== 'admin' && payout.host._id.toString() !== req.user.id) {
    return next(new AppError('You do not have permission to view this payout', 403));
  }

  res.status(200).json({
    success: true,
    data: {
      payout
    }
  });
});

// @desc    Cancel payout request (Host only, only pending status)
// @route   PUT /api/payouts/:id/cancel
// @access  Private (Host only)
exports.cancelPayout = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const hostId = req.user.id;

  const payout = await Payout.findOne({ _id: id, host: hostId });

  if (!payout) {
    return next(new AppError('Payout request not found', 404));
  }

  if (payout.status !== 'pending') {
    return next(new AppError('Only pending payout requests can be cancelled', 400));
  }

  payout.status = 'cancelled';
  await payout.save();

  res.status(200).json({
    success: true,
    message: 'Payout request cancelled successfully',
    data: {
      payout
    }
  });
});

// @desc    Get host's bank account
// @route   GET /api/payouts/bank-account
// @access  Private (Host only)
exports.getBankAccount = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('bankAccount');

  res.status(200).json({
    success: true,
    data: {
      bankAccount: user.bankAccount || null
    }
  });
});

// @desc    Save or update bank account
// @route   PUT /api/payouts/bank-account
// @access  Private (Host only)
exports.updateBankAccount = catchAsync(async (req, res, next) => {
  const { bankName, accountHolderName, accountNumber, rib, iban, swiftCode } = req.body;

  if (!bankName || !accountHolderName || !accountNumber || !rib) {
    return next(new AppError('All required bank account fields must be provided', 400));
  }

  // Validate RIB format
  if (!/^\d{20}$/.test(rib)) {
    return next(new AppError('RIB must be exactly 20 digits', 400));
  }

  const user = await User.findByIdAndUpdate(
    req.user.id,
    {
      bankAccount: {
        bankName,
        accountHolderName,
        accountNumber,
        rib,
        iban: iban || '',
        swiftCode: swiftCode || '',
        isVerified: false
      }
    },
    { new: true, runValidators: true }
  ).select('bankAccount');

  res.status(200).json({
    success: true,
    message: 'Bank account updated successfully',
    data: {
      bankAccount: user.bankAccount
    }
  });
});

// @desc    Get available balance for withdrawal
// @route   GET /api/payouts/available-balance
// @access  Private (Host only)
exports.getAvailableBalance = catchAsync(async (req, res, next) => {
  const hostId = req.user.id;

  // Get all completed bookings
  const completedBookings = await Booking.find({
    host: hostId,
    status: 'completed',
    'payment.status': 'paid'
  });

  const totalEarnings = completedBookings.reduce((sum, booking) => {
    return sum + calculateHostEarning(booking);
  }, 0);

  // Get all payouts (completed, processing, or pending)
  const payouts = await Payout.find({
    host: hostId,
    status: { $in: ['completed', 'processing', 'pending'] }
  });

  const totalWithdrawn = payouts.reduce((sum, payout) => {
    return sum + payout.amount;
  }, 0);

  const availableBalance = totalEarnings - totalWithdrawn;

  res.status(200).json({
    success: true,
    data: {
      totalEarnings,
      totalWithdrawn,
      availableBalance,
      currency: 'DZD',
      minimumWithdrawal: 1000
    }
  });
});
