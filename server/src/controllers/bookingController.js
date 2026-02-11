const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');
const Booking = require('../models/Booking');
const Listing = require('../models/Listing');
const User = require('../models/User');
const Notification = require('../models/Notification');
const moment = require('moment');
const {
  sendBookingCreatedEmail,
  sendBookingUpdatedEmail,
  sendBookingApprovedEmail,
  sendBookingRejectedEmail,
  sendBookingUpdatedByGuestEmail,
  sendBookingUpdatedByAdminEmail,
  sendPaymentConfirmedByHostEmail,
  sendBookingCancelledEmail
} = require('../utils/emailService');
const { sanitizeUserData, sanitizeBookingsArray } = require('../../utils/sanitizeBookingData');
const { GUEST_SERVICE_FEE_RATE, HOST_COMMISSION_RATE } = require('../config/fees');

// Get all bookings for a guest
const getGuestBookings = catchAsync(async (req, res, next) => {
  const guestId = req.user.id;
  const { status, startDate, endDate, page = 1, limit = 10 } = req.query;

  // Build query
  const query = { guest: guestId };

  if (status) {
    query.status = status;
    console.log(`[getGuestBookings] Filtering by status: "${status}" for guest: ${guestId}`);
  }

  if (startDate || endDate) {
    query.startDate = {};
    if (startDate) query.startDate.$gte = new Date(startDate);
    if (endDate) query.startDate.$lte = new Date(endDate);
  }

  console.log('[getGuestBookings] Query:', JSON.stringify(query));

  // Execute query with pagination
  const skip = (page - 1) * limit;
  const bookings = await Booking.find(query)
    .populate('listing', 'title category subcategory images address pricing')
    .populate('host', 'firstName lastName avatar')
    .populate('guestReview', 'rating comment status')
    .populate('hostReview', 'rating comment status')
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit));

  console.log(`[getGuestBookings] Found ${bookings.length} bookings`);
  if (status && bookings.length === 0) {
    console.warn(`[getGuestBookings] ⚠️ No bookings found with status "${status}" for guest ${guestId}`);
  }

  const total = await Booking.countDocuments(query);
  console.log(`[getGuestBookings] Total matching bookings: ${total}`);

  // ✅ FIX: Calculate stats for this guest's bookings
  const stats = {
    total: await Booking.countDocuments({ guest: guestId }),
    pending: await Booking.countDocuments({ guest: guestId, status: 'pending' }),
    confirmed: await Booking.countDocuments({ guest: guestId, status: 'confirmed' }),
    active: await Booking.countDocuments({ guest: guestId, status: 'active' }),
    completed: await Booking.countDocuments({ guest: guestId, status: 'completed' }),
    cancelled: await Booking.countDocuments({ guest: guestId, status: { $regex: 'cancelled' } }),
    payment_pending: await Booking.countDocuments({ guest: guestId, 'payment.status': 'pending' }),
    payment_completed: await Booking.countDocuments({ guest: guestId, 'payment.status': { $in: ['completed', 'paid'] } })
  };

  const sanitizedBookings = sanitizeBookingsArray(bookings, req.user.id, req.user.role);

  res.status(200).json({
    status: 'success',
    results: sanitizedBookings.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    },
    stats,
    data: {
      bookings: sanitizedBookings
    }
  });
});

// Get single booking
const getBooking = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id)
    .populate('listing')
    .populate('guest', 'firstName lastName avatar phone email')
    .populate('host', 'firstName lastName avatar phone email')
    .populate('guestReview')
    .populate('hostReview');

  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  // Ensure populated fields exist before accessing _id
  const guestId = booking.guest?._id ? booking.guest._id.toString() : null;
  const hostId = booking.host?._id ? booking.host._id.toString() : null;

  // Check if user has access to this booking
  if (
    guestId !== req.user.id &&
    hostId !== req.user.id &&
    req.user.role !== 'admin'
  ) {
    return next(new AppError('You do not have permission to view this booking', 403));
  }

  const sanitizedBooking = sanitizeUserData(booking, req.user.id, req.user.role);

  res.status(200).json({
    status: 'success',
    data: {
      booking: sanitizedBooking
    }
  });
});

// Create new booking
const createBooking = catchAsync(async (req, res, next) => {
  const {
    listing,
    startDate,
    endDate,
    guestCount,
    specialRequests,
    paymentMethod
  } = req.body;

  // Validate dates (P0 #6)
  const start = moment(startDate);
  const end = moment(endDate);
  if (!start.isValid() || !end.isValid()) {
    return next(new AppError('Invalid dates provided', 400));
  }
  if (end.isSameOrBefore(start)) {
    return next(new AppError('End date must be after start date', 400));
  }
  if (start.isBefore(moment().startOf('day'))) {
    return next(new AppError('Start date cannot be in the past', 400));
  }

  // Validate guest count (P0 #7)
  if (!guestCount || !guestCount.adults || guestCount.adults < 1) {
    return next(new AppError('At least 1 adult guest is required', 400));
  }
  if (guestCount.children < 0 || guestCount.infants < 0) {
    return next(new AppError('Guest count cannot be negative', 400));
  }

  // Get listing
  const listingDoc = await Listing.findById(listing);
  if (!listingDoc) {
    return next(new AppError('Listing not found', 404));
  }

  if (listingDoc.status !== 'active') {
    return next(new AppError('This listing is not available for booking', 400));
  }

  // Check availability
  const isAvailable = await Booking.checkAvailability(listing, new Date(startDate), new Date(endDate));
  if (!isAvailable) {
    return next(new AppError('This listing is not available for the selected dates', 400));
  }

  const nights = end.diff(start, 'days');

  if (nights < listingDoc.availability.minStay) {
    return next(new AppError(`Minimum stay is ${listingDoc.availability.minStay} nights`, 400));
  }

  if (nights > listingDoc.availability.maxStay) {
    return next(new AppError(`Maximum stay is ${listingDoc.availability.maxStay} nights`, 400));
  }

  // Create booking
  const booking = await Booking.create({
    listing,
    guest: req.user.id,
    host: listingDoc.host,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    checkInTime: listingDoc.availability.checkInFrom,
    checkOutTime: listingDoc.availability.checkOutBefore,
    guestCount: {
      adults: guestCount.adults || 1,
      children: guestCount.children || 0,
      infants: guestCount.infants || 0
    },
    pricing: {
      basePrice: listingDoc.pricing.basePrice,
      nights,
      subtotal: listingDoc.pricing.basePrice * nights,
      cleaningFee: listingDoc.pricing.cleaningFee || 0,
      serviceFee: 0, // Will be calculated in pre-save hook
      taxes: 0, // Will be calculated in pre-save hook
      totalAmount: 0, // Will be calculated in pre-save hook
      currency: listingDoc.pricing.currency,
      securityDeposit: listingDoc.pricing.securityDeposit || 0
    },
    payment: {
      method: paymentMethod || 'slickpay',
      status: 'pending'
    },
    status: listingDoc.availability.instantBook ? 'confirmed' : 'pending',
    specialRequests: specialRequests || '',
    // ✅ NEW: Set 24h deadline for host response if not instant book
    hostResponse: listingDoc.availability.instantBook ? {} : {
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      reminder12hSent: false,
      reminder22hSent: false,
      autoExpired: false
    }
  });

  // Re-check availability after creation to prevent TOCTOU race condition (P0 #5)
  const isStillAvailable = await Booking.checkAvailability(
    listing, new Date(startDate), new Date(endDate), booking._id
  );
  if (!isStillAvailable) {
    await Booking.findByIdAndDelete(booking._id);
    return next(new AppError('This listing was just booked by someone else for the selected dates. Please choose different dates.', 409));
  }

  // Populate booking
  await booking.populate('listing', 'title category images address pricing');
  await booking.populate('host', 'firstName lastName avatar');
  await booking.populate('guest', 'firstName lastName email');

  // Send email notifications to guest and host
  try {
    const guest = req.user;
    const host = await User.findById(listingDoc.host);

    // Send booking confirmation email to guest
    await sendBookingCreatedEmail(guest, booking, 'guest');

    // Send new booking notification email to host
    await sendBookingCreatedEmail(host, booking, 'host');
  } catch (emailError) {
    console.error('Error sending booking creation emails:', emailError);
  }

  res.status(201).json({
    status: 'success',
    data: {
      booking
    }
  });
});

// Update booking
const updateBooking = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  // Check permission
  if (booking.guest.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to update this booking', 403));
  }

  // Only allow updates for pending or confirmed bookings
  if (!['pending', 'confirmed'].includes(booking.status)) {
    return next(new AppError('Cannot update booking with this status', 400));
  }

  const { startDate, endDate, guestCount, specialRequests } = req.body;

  // If dates are being changed, check availability
  if (startDate || endDate) {
    const newStartDate = startDate ? new Date(startDate) : booking.startDate;
    const newEndDate = endDate ? new Date(endDate) : booking.endDate;

    const isAvailable = await Booking.checkAvailability(
      booking.listing,
      newStartDate,
      newEndDate,
      booking._id
    );

    if (!isAvailable) {
      return next(new AppError('Listing is not available for the new dates', 400));
    }

    booking.startDate = newStartDate;
    booking.endDate = newEndDate;
  }

  if (guestCount) {
    booking.guestCount = {
      adults: guestCount.adults || booking.guestCount.adults,
      children: guestCount.children !== undefined ? guestCount.children : booking.guestCount.children,
      infants: guestCount.infants !== undefined ? guestCount.infants : booking.guestCount.infants
    };
  }

  if (specialRequests !== undefined) {
    booking.specialRequests = specialRequests;
  }

  await booking.save();

  await booking.populate('listing', 'title category images address pricing');
  await booking.populate('host', 'firstName lastName avatar email');
  await booking.populate('guest', 'firstName lastName email');

  // Send email notifications about booking update
  try {
    const isGuestUpdate = booking.guest._id.toString() === req.user.id;
    const isAdminUpdate = req.user.role === 'admin';

    if (isGuestUpdate) {
      // Guest updated booking - notify host
      const host = await User.findById(booking.host._id);
      await sendBookingUpdatedByGuestEmail(host, booking, `Check-in: ${new Date(booking.startDate).toLocaleDateString()}, Check-out: ${new Date(booking.endDate).toLocaleDateString()}, Guests: ${booking.guestCount.adults} adults`);

      // Notify guest of their update
      await sendBookingUpdatedEmail(req.user, booking, 'guest');
    } else if (isAdminUpdate) {
      // Admin updated booking - notify both guest and host
      const guest = await User.findById(booking.guest._id);
      const host = await User.findById(booking.host._id);
      await sendBookingUpdatedByAdminEmail(guest, booking, 'guest');
      await sendBookingUpdatedByAdminEmail(host, booking, 'host');
    }
  } catch (emailError) {
    console.error('Error sending booking update emails:', emailError);
  }

  res.status(200).json({
    status: 'success',
    data: {
      booking
    }
  });
});

// Cancel booking - Uses refundCalculator for proper policy-based refunds
const cancelBooking = catchAsync(async (req, res, next) => {
  const refundCalculator = require('../services/refundCalculator');
  const Escrow = require('../models/Escrow');
  const escrowService = require('../services/escrowService');

  // Populate listing for cancellation policy, guest/host for notifications
  const booking = await Booking.findById(req.params.id)
    .populate('listing', 'title category images address pricing cancellationPolicy')
    .populate('guest', 'firstName lastName email phone avatar')
    .populate('host', 'firstName lastName email phone avatar');

  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  // Check permission - Allow both guest and host to cancel
  const guestId = booking.guest?._id ? booking.guest._id.toString() : booking.guest.toString();
  const hostId = booking.host?._id ? booking.host._id.toString() : booking.host.toString();
  const isGuest = guestId === req.user.id;
  const isHost = hostId === req.user.id;
  const isAdmin = req.user.role === 'admin';

  if (!isGuest && !isHost && !isAdmin) {
    return next(new AppError('You do not have permission to cancel this booking', 403));
  }

  // Check if booking can be cancelled
  if (['completed', 'cancelled_by_guest', 'cancelled_by_host', 'cancelled_by_admin'].includes(booking.status)) {
    return next(new AppError('This booking cannot be cancelled', 400));
  }

  const { reason } = req.body;

  // Determine who is cancelling
  let cancelledByRole = 'guest';
  if (isHost) {
    cancelledByRole = 'host';
  } else if (isAdmin) {
    cancelledByRole = 'admin';
  }

  // Use refundCalculator for proper policy-based refund calculation
  const refundResult = refundCalculator.calculateRefund(booking, {
    reason: cancelledByRole === 'host' ? 'host_cancellation' : 'guest_cancellation',
    cancellationDate: new Date()
  });

  // Cap refund at total amount to prevent over-refunding (P1 #21)
  const refundAmount = Math.min(refundResult.refund.total, refundResult.original.totalAmount);
  const cancellationFee = refundResult.original.totalAmount - refundAmount;
  const daysUntilCheckIn = Math.ceil((new Date(booking.startDate) - new Date()) / (1000 * 60 * 60 * 24));

  // Set booking status based on who cancelled
  booking.status = `cancelled_by_${cancelledByRole}`;
  booking.cancellation = {
    cancelledBy: req.user.id,
    cancelledAt: new Date(),
    reason: reason || `${cancelledByRole}_request`,
    refundAmount,
    cancellationFee
  };

  // Update payment if payment was made
  if (booking.payment.status === 'paid') {
    const isFullRefund = refundAmount >= refundResult.original.totalAmount * 0.99; // Allow 1% margin for rounding
    booking.payment.status = refundAmount > 0 ? (isFullRefund ? 'refunded' : 'partially_refunded') : 'paid';
    booking.payment.refundAmount = refundAmount;
    booking.payment.refundReason = refundResult.summary;
    booking.payment.refundedAt = new Date();
    booking.payment.refundBreakdown = refundResult.refund;

    // Process actual refund via escrow service if escrow exists
    const escrow = await Escrow.findOne({ booking: booking._id });
    if (escrow && refundAmount > 0) {
      try {
        await escrowService.processCancellationRefund(escrow, {
          reason: cancelledByRole === 'host' ? 'host_cancellation' : 'guest_cancellation',
          cancellationDate: new Date()
        });
        console.log(`[CancelBooking] Processed escrow refund for booking ${booking._id}`);
      } catch (escrowError) {
        console.error('[CancelBooking] Escrow refund failed:', escrowError.message);
        // Continue - admin will need to process manually
      }
    }
  }

  await booking.save({ validateBeforeSave: false });

  await booking.populate('host', 'firstName lastName avatar');
  await booking.populate('guest', 'firstName lastName avatar phone email');

  // Format currency for notifications
  const currency = booking.pricing.currency || 'DZD';
  const formatAmount = (amount) => `${amount} ${currency}`;

  // Create notifications for cancellation
  try {
    if (cancelledByRole === 'guest') {
      // Notify guest about cancellation with detailed breakdown
      await Notification.createNotification({
        recipient: booking.guest._id,
        type: 'booking_cancelled_by_guest',
        title: 'Réservation annulée ❌',
        message: refundResult.summary,
        data: {
          bookingId: booking._id,
          listingTitle: booking.listing.title,
          refundAmount,
          refundBreakdown: refundResult.refund,
          cancellationFee,
          isGracePeriod: refundResult.cancellation.isInGracePeriod,
          reason: reason || 'guest_request'
        },
        link: `/dashboard/bookings/${booking._id}`,
        priority: 'high'
      });

      // Notify host about guest cancellation
      await Notification.createNotification({
        recipient: booking.host._id,
        type: 'booking_cancelled_by_guest',
        title: 'Réservation annulée par le voyageur ❌',
        message: `${booking.guest.firstName} ${booking.guest.lastName} a annulé sa réservation pour "${booking.listing.title}". ${refundResult.distribution.hostReceives > 0 ? `Vous recevrez ${formatAmount(refundResult.distribution.hostReceives)}.` : ''}`,
        data: {
          bookingId: booking._id,
          listingTitle: booking.listing.title,
          guestName: `${booking.guest.firstName} ${booking.guest.lastName}`,
          hostReceives: refundResult.distribution.hostReceives,
          reason: reason || 'guest_request'
        },
        link: `/dashboard/host/bookings/${booking._id}`,
        priority: 'high'
      });
    } else if (cancelledByRole === 'host') {
      // Notify guest about host cancellation (always full refund)
      await Notification.createNotification({
        recipient: booking.guest._id,
        type: 'booking_cancelled_by_host',
        title: 'Réservation annulée par l\'hôte ❌',
        message: `Votre réservation pour "${booking.listing.title}" a été annulée par l'hôte. Vous recevrez un remboursement complet de ${formatAmount(refundAmount)}.`,
        data: {
          bookingId: booking._id,
          listingTitle: booking.listing.title,
          refundAmount,
          reason: reason || 'host_request'
        },
        link: `/dashboard/bookings/${booking._id}`,
        priority: 'urgent'
      });

      // Notify host about their cancellation
      await Notification.createNotification({
        recipient: booking.host._id,
        type: 'booking_cancelled_by_host',
        title: 'Réservation annulée ❌',
        message: `Vous avez annulé la réservation de ${booking.guest.firstName} ${booking.guest.lastName} pour "${booking.listing.title}". Le voyageur recevra un remboursement complet.`,
        data: {
          bookingId: booking._id,
          listingTitle: booking.listing.title,
          guestName: `${booking.guest.firstName} ${booking.guest.lastName}`,
          refundAmount,
          reason: reason || 'host_request'
        },
        link: `/dashboard/host/bookings/${booking._id}`,
        priority: 'high'
      });
    }
  } catch (notificationError) {
    console.error('Error creating cancellation notifications:', notificationError);
  }

  // Send cancellation emails
  try {
    const guest = await User.findById(booking.guest._id);
    const host = await User.findById(booking.host._id);

    // Send email to guest
    await sendBookingCancelledEmail(guest, booking, 'guest', cancelledByRole);

    // Send email to host
    await sendBookingCancelledEmail(host, booking, 'host', cancelledByRole);
  } catch (emailError) {
    console.error('Error sending cancellation emails:', emailError);
  }

  res.status(200).json({
    status: 'success',
    message: 'Booking cancelled successfully',
    data: {
      booking,
      refundInfo: {
        refundAmount,
        refundBreakdown: refundResult.refund,
        cancellationFee,
        daysUntilCheckIn,
        cancelledBy: cancelledByRole,
        cancellationPolicy: refundResult.booking.cancellationPolicy,
        isGracePeriod: refundResult.cancellation.isInGracePeriod,
        distribution: refundResult.distribution,
        summary: refundResult.summary,
        refundStatus: refundAmount > 0 ? 'Processing refund' : 'No refund applicable'
      }
    }
  });
});

// Delete booking (only for pending bookings or admins)
const deleteBooking = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  // Check permission
  if (req.user.role !== 'admin' && booking.guest.toString() !== req.user.id) {
    return next(new AppError('You do not have permission to delete this booking', 403));
  }

  // Only allow deletion of pending bookings or by admin
  if (booking.status !== 'pending' && req.user.role !== 'admin') {
    return next(new AppError('Only pending bookings can be deleted', 400));
  }

  await booking.deleteOne();

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Get booking calendar data
const getBookingCalendar = catchAsync(async (req, res, next) => {
  const guestId = req.user.id;
  const { year, month } = req.query;

  let startDate, endDate;

  if (year && month) {
    startDate = moment(`${year}-${month}-01`).startOf('month').toDate();
    endDate = moment(startDate).endOf('month').toDate();
  } else {
    // Get current month and next 2 months
    startDate = moment().startOf('month').toDate();
    endDate = moment().add(2, 'months').endOf('month').toDate();
  }

  const bookings = await Booking.find({
    guest: guestId,
    status: { $in: ['confirmed', 'paid', 'active', 'completed'] },
    $or: [
      {
        startDate: { $gte: startDate, $lte: endDate }
      },
      {
        endDate: { $gte: startDate, $lte: endDate }
      },
      {
        startDate: { $lte: startDate },
        endDate: { $gte: endDate }
      }
    ]
  })
    .populate('listing', 'title category images address')
    .sort('startDate');

  // Format bookings for calendar
  const calendarEvents = bookings.map(booking => ({
    id: booking._id,
    title: booking.listing.title,
    start: booking.startDate,
    end: booking.endDate,
    status: booking.status,
    color: booking.statusColor,
    listing: {
      id: booking.listing._id,
      title: booking.listing.title,
      category: booking.listing.category,
      image: booking.listing.images?.[0]?.url,
      address: booking.listing.address
    }
  }));

  res.status(200).json({
    status: 'success',
    results: calendarEvents.length,
    data: {
      events: calendarEvents,
      period: {
        start: startDate,
        end: endDate
      }
    }
  });
});

// Get booking statistics
const getBookingStats = catchAsync(async (req, res, next) => {
  const guestId = req.user.id;

  const stats = await Booking.aggregate([
    {
      $match: { guest: guestId }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$pricing.totalAmount' }
      }
    }
  ]);

  const upcomingCount = await Booking.countDocuments({
    guest: guestId,
    status: { $in: ['confirmed', 'paid'] },
    startDate: { $gte: new Date() }
  });

  const activeCount = await Booking.countDocuments({
    guest: guestId,
    status: 'active'
  });

  res.status(200).json({
    status: 'success',
    data: {
      stats,
      summary: {
        upcoming: upcomingCount,
        active: activeCount
      }
    }
  });
});

// Get travel history (completed and past bookings)
const getTravelHistory = catchAsync(async (req, res, next) => {
  const guestId = req.user.id;
  const { year, category, sort = '-endDate', page = 1, limit = 12 } = req.query;

  const now = new Date();

  // Build query for travel history
  // Include completed bookings OR past bookings with paid/active status
  let query = {
    guest: guestId,
    $or: [
      { status: 'completed' },
      {
        status: { $in: ['paid', 'active'] },
        endDate: { $lt: now }
      }
    ]
  };

  // Filter by year if specified
  if (year && year !== 'all') {
    const startOfYear = new Date(`${year}-01-01`);
    const endOfYear = new Date(`${year}-12-31T23:59:59`);

    // For year filtering, check completion date for completed bookings
    query = {
      guest: guestId,
      $or: [
        {
          status: 'completed',
          $or: [
            { 'completion.completedAt': { $gte: startOfYear, $lte: endOfYear } },
            { endDate: { $gte: startOfYear, $lte: endOfYear } }
          ]
        },
        {
          status: { $in: ['paid', 'active'] },
          endDate: { $gte: startOfYear, $lte: endOfYear, $lt: now }
        }
      ]
    };
  }

  // Execute query with pagination
  const skip = (page - 1) * limit;
  const bookings = await Booking.find(query)
    .populate({
      path: 'listing',
      select: 'title category subcategory images address pricing location'
    })
    .populate('host', 'firstName lastName avatar')
    .populate({
      path: 'guestReview',
      select: 'rating comment createdAt'
    })
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  // Filter by category if provided
  let filteredBookings = bookings;
  if (category && category !== 'all') {
    filteredBookings = bookings.filter(b => b.listing?.category === category);
  }

  // Add review info to each booking
  filteredBookings = filteredBookings.map(booking => {
    const reviewData = booking.guestReview ? {
      rating: booking.guestReview.rating,
      comment: booking.guestReview.comment,
      reviewedAt: booking.guestReview.createdAt
    } : null;

    return {
      ...booking,
      review: reviewData
    };
  });

  const total = await Booking.countDocuments(query);

  // Calculate statistics
  const totalSpent = filteredBookings.reduce((sum, b) => sum + (b.pricing?.totalAmount || 0), 0);
  const uniqueDestinations = [...new Set(filteredBookings.map(b => b.listing?.address?.city))].filter(Boolean).length;
  const totalNights = filteredBookings.reduce((sum, b) => sum + (b.pricing?.nights || 0), 0);

  res.status(200).json({
    status: 'success',
    results: filteredBookings.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    },
    statistics: {
      totalTrips: total,
      totalSpent,
      uniqueDestinations,
      totalNights
    },
    data: {
      bookings: filteredBookings
    }
  });
});

// Add review to completed booking
const addReviewToBooking = catchAsync(async (req, res, next) => {
  const { bookingId } = req.params;
  const { rating, comment, reviewId } = req.body;

  const booking = await Booking.findById(bookingId);

  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  if (booking.guest.toString() !== req.user.id) {
    return next(new AppError('You do not have permission to review this booking', 403));
  }

  if (booking.status !== 'completed') {
    return next(new AppError('You can only review completed bookings', 400));
  }

  // Link review to booking
  booking.review = {
    rating,
    comment,
    reviewId,
    reviewedAt: new Date()
  };

  await booking.save();

  res.status(200).json({
    status: 'success',
    message: 'Review added successfully',
    data: {
      booking
    }
  });
});

// Get travel history statistics
const getTravelHistoryStats = catchAsync(async (req, res, next) => {
  const guestId = req.user.id;
  const now = new Date();

  // Get all travel history bookings (completed or past bookings with paid/active status)
  const completedBookings = await Booking.find({
    guest: guestId,
    $or: [
      { status: 'completed' },
      {
        status: { $in: ['paid', 'active'] },
        endDate: { $lt: now }
      }
    ]
  })
    .populate('listing', 'category address pricing')
    .lean();

  // Calculate statistics
  const totalTrips = completedBookings.length;
  const totalSpent = completedBookings.reduce((sum, b) => sum + (b.pricing?.totalAmount || 0), 0);
  const totalNights = completedBookings.reduce((sum, b) => sum + (b.pricing?.nights || 0), 0);

  // Unique destinations
  const cities = completedBookings.map(b => b.listing?.address?.city).filter(Boolean);
  const uniqueDestinations = [...new Set(cities)].length;

  // Countries visited
  const countries = completedBookings.map(b => b.listing?.address?.country).filter(Boolean);
  const countriesVisited = [...new Set(countries)].length;

  // By category
  const byCategory = completedBookings.reduce((acc, b) => {
    const cat = b.listing?.category || 'unknown';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  // By year
  const byYear = completedBookings.reduce((acc, b) => {
    const year = new Date(b.endDate).getFullYear();
    if (!acc[year]) {
      acc[year] = {
        trips: 0,
        spent: 0,
        nights: 0
      };
    }
    acc[year].trips++;
    acc[year].spent += b.pricing?.totalAmount || 0;
    acc[year].nights += b.pricing?.nights || 0;
    return acc;
  }, {});

  // Most visited city
  const cityCounts = cities.reduce((acc, city) => {
    acc[city] = (acc[city] || 0) + 1;
    return acc;
  }, {});
  const mostVisitedCity = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0];

  res.status(200).json({
    status: 'success',
    data: {
      summary: {
        totalTrips,
        totalSpent,
        totalNights,
        uniqueDestinations,
        countriesVisited,
        averageSpentPerTrip: totalTrips > 0 ? Math.round(totalSpent / totalTrips) : 0
      },
      byCategory,
      byYear,
      mostVisitedCity: mostVisitedCity ? {
        name: mostVisitedCity[0],
        visits: mostVisitedCity[1]
      } : null
    }
  });
});

// Get all bookings for a host
const getHostBookings = catchAsync(async (req, res, next) => {
  const hostId = req.user.id;
  const { status, startDate, endDate, listingId, page = 1, limit = 20 } = req.query;

  // Build query - find all bookings where user is the host
  const query = { host: hostId };

  if (status) {
    query.status = status;
    console.log(`[getHostBookings] Filtering by status: "${status}" for host: ${hostId}`);
  }

  if (listingId) {
    query.listing = listingId;
  }

  if (startDate || endDate) {
    query.startDate = {};
    if (startDate) query.startDate.$gte = new Date(startDate);
    if (endDate) query.startDate.$lte = new Date(endDate);
  }

  console.log('[getHostBookings] Query:', JSON.stringify(query));

  // Execute query with pagination
  const skip = (page - 1) * limit;
  const bookings = await Booking.find(query)
    .populate('listing', 'title category subcategory images address pricing')
    .populate('guest', 'firstName lastName avatar')
    .populate('guestReview', 'rating comment status')
    .populate('hostReview', 'rating comment status')
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit));

  console.log(`[getHostBookings] Found ${bookings.length} bookings`);
  if (status && bookings.length === 0) {
    console.warn(`[getHostBookings] ⚠️ No bookings found with status "${status}" for host ${hostId}`);
  }

  const total = await Booking.countDocuments(query);
  console.log(`[getHostBookings] Total matching bookings: ${total}`);

  // Calculate statistics
  const stats = {
    total: total,
    pending: await Booking.countDocuments({ host: hostId, status: 'pending' }),
    confirmed: await Booking.countDocuments({ host: hostId, status: 'confirmed' }),
    paid: await Booking.countDocuments({ host: hostId, status: 'paid' }),
    active: await Booking.countDocuments({ host: hostId, status: 'active' }),
    completed: await Booking.countDocuments({ host: hostId, status: 'completed' })
  };

  // Calculate revenue
  const revenueData = await Booking.aggregate([
    {
      $match: {
        host: hostId,
        status: { $in: ['paid', 'active', 'completed'] }
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$pricing.totalAmount' },
        pendingRevenue: {
          $sum: {
            $cond: [
              { $eq: ['$status', 'confirmed'] },
              '$pricing.totalAmount',
              0
            ]
          }
        }
      }
    }
  ]);

  const revenue = revenueData[0] || { totalRevenue: 0, pendingRevenue: 0 };

  const sanitizedBookings = sanitizeBookingsArray(bookings, req.user.id, req.user.role);

  res.status(200).json({
    status: 'success',
    results: sanitizedBookings.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    },
    stats: {
      ...stats,
      totalRevenue: revenue.totalRevenue,
      pendingRevenue: revenue.pendingRevenue
    },
    data: {
      bookings: sanitizedBookings
    }
  });
});

// Get host bookings calendar data
const getHostBookingsCalendar = catchAsync(async (req, res, next) => {
  const hostId = req.user.id;
  const { year, month, listingId } = req.query;

  let startDate, endDate;

  if (year && month) {
    startDate = moment(`${year}-${month}-01`).startOf('month').toDate();
    endDate = moment(startDate).endOf('month').toDate();
  } else {
    // Get current month
    startDate = moment().startOf('month').toDate();
    endDate = moment().endOf('month').toDate();
  }

  const query = {
    host: hostId,
    status: { $in: ['pending', 'confirmed', 'paid', 'active', 'completed'] },
    $or: [
      {
        startDate: { $gte: startDate, $lte: endDate }
      },
      {
        endDate: { $gte: startDate, $lte: endDate }
      },
      {
        startDate: { $lte: startDate },
        endDate: { $gte: endDate }
      }
    ]
  };

  if (listingId) {
    query.listing = listingId;
  }

  const bookings = await Booking.find(query)
    .populate('listing', 'title category images address')
    .populate('guest', 'firstName lastName avatar')
    .sort('startDate');

  // Format bookings for calendar
  const calendarEvents = bookings.map(booking => ({
    id: booking._id,
    title: booking.listing.title,
    guestName: `${booking.guest.firstName} ${booking.guest.lastName}`,
    start: booking.startDate,
    end: booking.endDate,
    status: booking.status,
    color: booking.statusColor,
    listing: {
      id: booking.listing._id,
      title: booking.listing.title,
      category: booking.listing.category,
      image: booking.listing.images?.[0]?.url,
      address: booking.listing.address
    },
    guest: {
      id: booking.guest._id,
      name: `${booking.guest.firstName} ${booking.guest.lastName}`,
      avatar: booking.guest.avatar
    },
    pricing: booking.pricing,
    guestCount: booking.guestCount
  }));

  res.status(200).json({
    status: 'success',
    results: calendarEvents.length,
    data: {
      events: calendarEvents,
      period: {
        start: startDate,
        end: endDate
      }
    }
  });
});

// Update booking status (host action - approve/reject)
const updateBookingStatus = catchAsync(async (req, res, next) => {
  const { status, hostMessage } = req.body;
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  // Check if user is the host
  if (booking.host.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to update this booking', 403));
  }

  // Validate status transitions
  const allowedTransitions = {
    pending: ['pending_payment', 'confirmed', 'cancelled_by_host'],
    pending_payment: ['confirmed', 'cancelled_by_host', 'cancelled_by_guest'],
    confirmed: ['paid', 'cancelled_by_host', 'cancelled_by_guest'],
    paid: ['active', 'cancelled_by_host']
  };

  if (!allowedTransitions[booking.status]?.includes(status)) {
    return next(new AppError(`Cannot change status from ${booking.status} to ${status}`, 400));
  }

  booking.status = status;
  if (hostMessage) {
    booking.hostMessage = hostMessage;
  }

  // Record host response time when they approve or reject
  if (booking.hostResponse && (status === 'pending_payment' || status === 'confirmed' || status === 'cancelled_by_host')) {
    booking.hostResponse.respondedAt = new Date();
  }

  await booking.save({ validateBeforeSave: false });

  await booking.populate('listing', 'title category images address pricing');
  await booking.populate('guest', 'firstName lastName avatar email');
  await booking.populate('host', 'firstName lastName avatar email');

  // Create in-app notifications and send emails based on status change
  try {
    const guest = await User.findById(booking.guest._id);
    const host = await User.findById(booking.host._id);

    if (status === 'pending_payment' || status === 'confirmed') {
      // Booking approved by host - guest needs to pay (pending_payment) or booking auto-confirmed
      await Notification.createNotification({
        recipient: booking.guest._id,
        type: 'booking_approved',
        title: 'Réservation acceptée! ✅',
        message: status === 'pending_payment'
          ? `Votre réservation pour "${booking.listing.title}" a été acceptée par l'hôte! Procédez au paiement pour confirmer.`
          : `Votre réservation pour "${booking.listing.title}" a été confirmée par l'hôte!`,
        data: {
          bookingId: booking._id,
          listingTitle: booking.listing.title,
          hostName: `${host.firstName} ${host.lastName}`,
          checkIn: booking.startDate,
          checkOut: booking.endDate,
          requiresPayment: status === 'pending_payment'
        },
        link: `/dashboard/bookings/${booking._id}`,
        priority: 'high'
      });

      // Email to guest
      await sendBookingApprovedEmail(guest, booking);

    } else if (status === 'cancelled_by_host') {
      // Booking rejected by host
      // In-app notification to guest
      await Notification.createNotification({
        recipient: booking.guest._id,
        type: 'booking_rejected',
        title: 'Booking Not Approved',
        message: `Your booking request for "${booking.listing.title}" was not approved by the host.`,
        data: {
          bookingId: booking._id,
          listingTitle: booking.listing.title,
          hostMessage: hostMessage || 'No message provided'
        },
        link: `/dashboard/bookings/${booking._id}`,
        priority: 'high'
      });

      // Email to guest
      await sendBookingRejectedEmail(guest, booking);

    } else if (status === 'paid') {
      // Payment confirmed (manual payment methods)
      // In-app notification to guest
      await Notification.createNotification({
        recipient: booking.guest._id,
        type: 'payment_confirmed_by_host',
        title: 'Payment Confirmed! 💰',
        message: `The host has confirmed receipt of your payment for "${booking.listing.title}". Your booking is now active!`,
        data: {
          bookingId: booking._id,
          listingTitle: booking.listing.title,
          amount: booking.pricing.totalAmount,
          currency: booking.pricing.currency
        },
        link: `/dashboard/bookings/${booking._id}`,
        priority: 'high'
      });

      // Email to guest
      await sendPaymentConfirmedByHostEmail(guest, booking);
    }
  } catch (notificationError) {
    console.error('Error creating booking status update notifications:', notificationError);
  }

  res.status(200).json({
    status: 'success',
    data: {
      booking
    }
  });
});

// Create booking with payment integration
// ✅ MULTI-PROVIDER: Automatically selects Stripe (EUR) or SlickPay (DZD) based on listing currency
const createBookingWithPayment = catchAsync(async (req, res, next) => {
  const {
    listing: listingId,
    startDate,
    endDate,
    guestCount,
    specialRequests,
    paymentCurrency // ✅ FIX: User's selected currency for dual-currency listings
  } = req.body;

  // Get listing details
  const listingDoc = await Listing.findById(listingId);
  if (!listingDoc) {
    return next(new AppError('Listing not found', 404));
  }

  if (listingDoc.status !== 'active') {
    return next(new AppError('This listing is not available for booking', 400));
  }

  // Check if guest is trying to book their own listing
  if (listingDoc.host.toString() === req.user.id) {
    return next(new AppError('You cannot book your own listing', 400));
  }

  // Check availability
  const isAvailable = await Booking.checkAvailability(listingId, new Date(startDate), new Date(endDate));
  if (!isAvailable) {
    return next(new AppError('This listing is not available for the selected dates', 400));
  }

  // Calculate duration
  const start = moment(startDate);
  const end = moment(endDate);
  const nights = end.diff(start, 'days');

  if (nights < listingDoc.availability.minStay) {
    return next(new AppError(`Minimum stay is ${listingDoc.availability.minStay} nights`, 400));
  }

  if (nights > listingDoc.availability.maxStay) {
    return next(new AppError(`Maximum stay is ${listingDoc.availability.maxStay} nights`, 400));
  }

  // ✅ FIX: First, determine payment currency - use user's selection for dual-currency listings
  const primaryCurrency = listingDoc.pricing.currency || 'DZD';
  const altCurrency = listingDoc.pricing.altCurrency;

  // Use paymentCurrency if provided AND listing accepts it, otherwise use primary
  let currency = primaryCurrency;
  let useAltPricing = false;
  if (paymentCurrency && paymentCurrency === altCurrency) {
    currency = paymentCurrency;
    useAltPricing = true;
    console.log(`💰 Using user's selected ALT currency: ${currency} (listing accepts: ${primaryCurrency}, ${altCurrency})`);
  } else if (paymentCurrency && paymentCurrency === primaryCurrency) {
    currency = primaryCurrency;
    console.log(`💰 Using primary currency: ${currency}`);
  }

  const paymentProvider = currency === 'EUR' ? 'stripe' : 'slickpay';
  console.log(`💳 Payment provider: ${paymentProvider} for currency: ${currency}`);

  // ✅ FIX: Calculate pricing using the correct price based on selected currency
  // For dual-currency listings, use altBasePrice/altCleaningFee when paying in altCurrency
  const basePrice = useAltPricing && listingDoc.pricing.altBasePrice
    ? listingDoc.pricing.altBasePrice
    : listingDoc.pricing.basePrice;
  const cleaningFee = useAltPricing && listingDoc.pricing.altCleaningFee !== undefined
    ? listingDoc.pricing.altCleaningFee
    : (listingDoc.pricing.cleaningFee || 0);

  console.log(`💵 Pricing: basePrice=${basePrice} ${currency}, cleaningFee=${cleaningFee} ${currency}, useAltPricing=${useAltPricing}`);

  const subtotal = basePrice * nights;
  const baseAmount = subtotal + cleaningFee;

  // Guest Service Fee: 8% of (subtotal + cleaningFee) - charged to guest
  const guestServiceFee = Math.round(baseAmount * GUEST_SERVICE_FEE_RATE);
  // Host Commission: 3% of (subtotal + cleaningFee) - deducted from host payout (internal)
  const hostCommission = Math.round(baseAmount * HOST_COMMISSION_RATE);
  // Legacy field for backward compatibility
  const serviceFee = guestServiceFee;
  // No taxes - hosts are responsible for their own tax declarations
  const taxes = 0;
  // Total paid by guest = subtotal + cleaningFee + guestServiceFee
  const totalAmount = subtotal + cleaningFee + guestServiceFee;

  // Get guest details
  const guest = await User.findById(req.user.id);

  // Create booking with pending_payment status
  const booking = await Booking.create({
    listing: listingId,
    guest: req.user.id,
    host: listingDoc.host,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    checkInTime: listingDoc.availability.checkInFrom,
    checkOutTime: listingDoc.availability.checkOutBefore,
    guestCount: {
      adults: guestCount?.adults || 1,
      children: guestCount?.children || 0,
      infants: guestCount?.infants || 0
    },
    pricing: {
      basePrice,
      nights,
      subtotal,
      cleaningFee,
      guestServiceFee,
      hostCommission,
      serviceFee, // Legacy field = guestServiceFee
      taxes,
      totalAmount,
      hostPayout: baseAmount - hostCommission,
      platformRevenue: guestServiceFee + hostCommission,
      currency,
      securityDeposit: listingDoc.pricing.securityDeposit || 0
    },
    payment: {
      method: paymentProvider,
      status: 'pending'
    },
    // ✅ FIX: Status depends on instant booking setting
    // - instantBook=true → pending_payment (proceed to payment)
    // - instantBook=false → pending (await host approval first)
    status: listingDoc.availability.instantBook ? 'pending_payment' : 'pending',
    specialRequests: specialRequests || '',
    // ✅ FIX: Set 24h deadline for host response if not instant book
    hostResponse: listingDoc.availability.instantBook ? {} : {
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      reminder12hSent: false,
      reminder22hSent: false,
      autoExpired: false
    }
  });

  // ✅ FIX: If NOT instant booking, don't initiate payment - just return booking info
  if (!listingDoc.availability.instantBook) {
    // Populate booking details
    await booking.populate('listing', 'title category images address pricing');
    await booking.populate('host', 'firstName lastName avatar email');

    // Notify host about new booking request
    try {
      await Notification.createNotification({
        recipient: listingDoc.host,
        type: 'booking_request',
        title: 'New Booking Request!',
        message: `${guest.firstName} ${guest.lastName} wants to book "${listingDoc.title}" for ${nights} night${nights > 1 ? 's' : ''}.`,
        data: {
          bookingId: booking._id,
          listingTitle: listingDoc.title,
          startDate: booking.startDate,
          endDate: booking.endDate,
          totalAmount: booking.pricing.totalAmount,
          currency: booking.pricing.currency,
          guestName: `${guest.firstName} ${guest.lastName}`
        }
      });

      // Notify guest that request was submitted
      await Notification.createNotification({
        recipient: req.user.id,
        type: 'booking_request_sent',
        title: 'Booking Request Sent!',
        message: `Your booking request for "${listingDoc.title}" has been sent to the host. You will receive a response within 24 hours.`,
        data: {
          bookingId: booking._id,
          listingTitle: listingDoc.title,
          hostDeadline: booking.hostResponse.deadline
        }
      });
    } catch (notifError) {
      console.error('Notification error (non-blocking):', notifError);
    }

    return res.status(201).json({
      status: 'success',
      message: 'Booking request sent! The host will respond within 24 hours.',
      data: {
        booking,
        requiresHostApproval: true,
        hostDeadline: booking.hostResponse.deadline
      }
    });
  }

  // ✅ For instant booking, proceed with payment
  try {
    let paymentResponse;

    // ✅ STRIPE for EUR payments
    if (paymentProvider === 'stripe') {
      const stripeService = require('../services/stripeService');

      const paymentIntent = await stripeService.createPaymentIntent({
        amount: totalAmount,
        currency: 'eur',
        bookingId: booking._id.toString(),
        guestEmail: guest.email,
        guestName: `${guest.firstName} ${guest.lastName}`,
        listingTitle: listingDoc.title,
        metadata: {
          nights: nights.toString(),
          startDate: start.format('YYYY-MM-DD'),
          endDate: end.format('YYYY-MM-DD')
        }
      });

      // Update booking with Stripe Payment Intent ID
      booking.payment.stripePaymentIntentId = paymentIntent.paymentIntentId;
      booking.payment.transactionId = paymentIntent.paymentIntentId;
      await booking.save({ validateBeforeSave: false });

      paymentResponse = {
        provider: 'stripe',
        clientSecret: paymentIntent.clientSecret,
        publishableKey: stripeService.getPublishableKey(),
        paymentIntentId: paymentIntent.paymentIntentId
      };
    }
    // ✅ SLICKPAY for DZD payments
    else {
      const slickPayService = require('../services/slickPayService');

      // Create invoice for Slick Pay
      const invoiceResult = await slickPayService.createInvoice({
        amount: Math.round(subtotal + cleaningFee + guestServiceFee),
        returnUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/booking/${booking._id}/confirmation`,
        guest: {
          firstName: guest.firstName,
          lastName: guest.lastName,
          email: guest.email,
          phone: guest.phone || '',
          address: guest.address || 'Algiers, Algeria'
        },
        items: [
          {
            name: `Réservation - ${listingDoc.title}`,
            price: subtotal,
            quantity: 1
          },
          {
            name: 'Frais de ménage',
            price: cleaningFee,
            quantity: 1
          },
          {
            name: 'Frais de service Baytup',
            price: guestServiceFee,
            quantity: 1
          }
        ],
        bookingId: booking._id.toString(),
        note: `Réservation du ${start.format('DD/MM/YYYY')} au ${end.format('DD/MM/YYYY')}`
      });

      // Update booking with SlickPay invoice ID
      booking.payment.transactionId = invoiceResult.invoiceId;
      booking.payment.method = 'slickpay';
      await booking.save({ validateBeforeSave: false });

      paymentResponse = {
        provider: 'slickpay',
        invoiceId: invoiceResult.invoiceId,
        paymentUrl: invoiceResult.paymentUrl
      };
    }

    // Populate booking details
    await booking.populate('listing', 'title category images address pricing');
    await booking.populate('host', 'firstName lastName avatar email');

    // Create notifications for guest and host
    try {
      // Notify guest
      await Notification.createNotification({
        recipient: req.user.id,
        type: 'booking_created',
        title: 'Booking Created Successfully!',
        message: `Your booking for "${booking.listing.title}" has been created. Complete the payment to confirm your reservation.`,
        data: {
          bookingId: booking._id,
          listingTitle: booking.listing.title,
          startDate: booking.startDate,
          endDate: booking.endDate,
          totalAmount: booking.pricing.totalAmount,
          currency: booking.pricing.currency
        },
        link: `/dashboard/bookings/${booking._id}`,
        priority: 'high'
      });

      // Notify host
      await Notification.createNotification({
        recipient: booking.host._id,
        type: 'booking_created',
        title: 'New Booking Request!',
        message: `${guest.firstName} ${guest.lastName} has created a booking for "${booking.listing.title}" from ${moment(booking.startDate).format('MMM DD')} to ${moment(booking.endDate).format('MMM DD, YYYY')}. Waiting for payment confirmation.`,
        data: {
          bookingId: booking._id,
          listingTitle: booking.listing.title,
          guestName: `${guest.firstName} ${guest.lastName}`,
          startDate: booking.startDate,
          endDate: booking.endDate,
          totalAmount: booking.pricing.totalAmount,
          currency: booking.pricing.currency
        },
        link: `/dashboard/host/bookings/${booking._id}`,
        priority: 'high'
      });
    } catch (notificationError) {
      console.error('Error creating booking notifications:', notificationError);
    }

    res.status(201).json({
      status: 'success',
      data: {
        booking,
        payment: paymentResponse
      }
    });
  } catch (error) {
    // Delete booking if payment invoice creation fails
    await booking.deleteOne();
    return next(new AppError(`Payment processing error: ${error.message}`, 500));
  }
});

// Verify payment and confirm booking
const verifyPaymentAndConfirmBooking = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const booking = await Booking.findById(id)
    .populate('listing', 'title category images address pricing')
    .populate('guest', 'firstName lastName email')
    .populate('host', 'firstName lastName email');

  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  // Check if user has access to this booking
  if (booking.guest._id.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to access this booking', 403));
  }

  // Check if booking already confirmed
  if (booking.status === 'confirmed' || booking.status === 'paid') {
    return res.status(200).json({
      status: 'success',
      message: 'Booking already confirmed',
      data: { booking }
    });
  }

  // ✅ MULTI-PROVIDER: Verify payment based on payment method
  if (booking.payment.transactionId || booking.payment.stripePaymentIntentId) {
    console.log('🔍 Verifying payment for booking:', {
      bookingId: booking._id,
      paymentMethod: booking.payment.method,
      transactionId: booking.payment.transactionId,
      stripePaymentIntentId: booking.payment.stripePaymentIntentId,
      currentStatus: booking.payment.status,
      currentBookingStatus: booking.status
    });

    try {
      let isPaid = false;
      let paymentStatus = 'pending';

      // ✅ STRIPE verification
      if (booking.payment.method === 'stripe' && booking.payment.stripePaymentIntentId) {
        const stripeService = require('../services/stripeService');
        console.log('📡 Calling Stripe API to check payment status...');

        const paymentIntent = await stripeService.getPaymentIntent(booking.payment.stripePaymentIntentId);
        console.log('✅ Stripe API Response:', paymentIntent);

        if (paymentIntent.status === 'succeeded') {
          isPaid = true;
          paymentStatus = 'paid';
          // Update Stripe charge ID if not already set
          if (paymentIntent.chargeId && !booking.payment.stripeChargeId) {
            booking.payment.stripeChargeId = paymentIntent.chargeId;
          }
        } else {
          paymentStatus = paymentIntent.status;
        }
      }
      // ✅ SLICKPAY verification
      else {
        const slickPayService = require('../services/slickPayService');
        console.log('📡 Calling SlickPay API to check invoice status...');

        const invoiceStatus = await slickPayService.getInvoiceStatus(booking.payment.transactionId);

        console.log('✅ SlickPay API Response:', {
          success: invoiceStatus.success,
          completed: invoiceStatus.completed,
          paymentStatus: invoiceStatus.paymentStatus,
          data: invoiceStatus.data
        });

        if (invoiceStatus.completed || invoiceStatus.paymentStatus === 'paid') {
          isPaid = true;
          paymentStatus = 'paid';
        } else {
          paymentStatus = invoiceStatus.paymentStatus || 'pending';
        }
      }

      // ✅ Common handling for paid bookings
      if (isPaid) {
        // Update booking status
        booking.status = 'confirmed';
        booking.payment.status = 'paid';
        booking.payment.paidAmount = booking.pricing.totalAmount;
        booking.payment.paidAt = new Date();

        await booking.save({ validateBeforeSave: false });

        // Create escrow for fund holding (if not already created by webhook)
        if (!booking.escrow) {
          try {
            const escrowService = require('../services/escrowService');
            const escrow = await escrowService.createEscrow(booking, {
              provider: booking.payment.method,
              transactionId: booking.payment.transactionId || booking.payment.stripePaymentIntentId
            });
            console.log(`[VerifyPayment] Created escrow ${escrow._id} for booking ${booking._id}`);
          } catch (escrowError) {
            console.error('[VerifyPayment] Failed to create escrow:', escrowError);
          }
        }

        // Create notifications for successful payment
        try {
          // Notify guest
          await Notification.createNotification({
            recipient: booking.guest._id,
            type: 'booking_payment_successful',
            title: 'Payment Confirmed!',
            message: `Your payment for "${booking.listing.title}" has been confirmed. Your booking is now confirmed!`,
            data: {
              bookingId: booking._id,
              listingTitle: booking.listing.title,
              amount: booking.pricing.totalAmount,
              currency: booking.pricing.currency,
              startDate: booking.startDate,
              endDate: booking.endDate
            },
            link: `/dashboard/bookings/${booking._id}`,
            priority: 'high'
          });

          // Notify host
          await Notification.createNotification({
            recipient: booking.host._id,
            type: 'booking_confirmed',
            title: 'Booking Confirmed!',
            message: `${booking.guest.firstName} ${booking.guest.lastName}'s payment has been confirmed for "${booking.listing.title}". The booking is now confirmed.`,
            data: {
              bookingId: booking._id,
              listingTitle: booking.listing.title,
              guestName: `${booking.guest.firstName} ${booking.guest.lastName}`,
              amount: booking.pricing.totalAmount,
              currency: booking.pricing.currency,
              startDate: booking.startDate,
              endDate: booking.endDate
            },
            link: `/dashboard/host/bookings/${booking._id}`,
            priority: 'high'
          });
        } catch (notificationError) {
          console.error('Error creating payment confirmation notifications:', notificationError);
        }

        return res.status(200).json({
          status: 'success',
          message: 'Payment confirmed! Your booking is now confirmed.',
          data: { booking }
        });
      } else {
        return res.status(200).json({
          status: 'pending',
          message: 'Payment is still pending',
          data: {
            booking,
            paymentStatus: paymentStatus
          }
        });
      }
    } catch (error) {
      console.error('❌ Error verifying payment:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        bookingId: booking._id,
        transactionId: booking.payment.transactionId,
        stripePaymentIntentId: booking.payment.stripePaymentIntentId
      });

      return next(new AppError(`Error verifying payment: ${error.message}`, 500));
    }
  } else {
    console.error('❌ No transactionId found for booking:', booking._id);
    return next(new AppError('No payment transaction found for this booking', 400));
  }
});

// Handle payment webhook from Slick Pay
const handlePaymentWebhook = catchAsync(async (req, res, next) => {
  const webhookData = req.body;
  const signature = req.headers['x-slickpay-signature'];

  const slickPayService = require('../services/slickPayService');

  // Verify webhook signature
  if (!slickPayService.verifyWebhookSignature(webhookData, signature)) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid webhook signature'
    });
  }

  // Extract booking ID from metadata
  const bookingId = webhookData.webhook_meta_data?.bookingId;

  if (!bookingId) {
    return res.status(400).json({
      status: 'error',
      message: 'Booking ID not found in webhook data'
    });
  }

  const booking = await Booking.findById(bookingId)
    .populate('listing', 'title')
    .populate('guest', 'firstName lastName email')
    .populate('host', 'firstName lastName email');

  if (!booking) {
    return res.status(404).json({
      status: 'error',
      message: 'Booking not found'
    });
  }

  // Update booking based on webhook event
  if (webhookData.event === 'invoice.paid' || webhookData.status === 'paid') {
    booking.status = 'confirmed';
    booking.payment.status = 'paid';
    booking.payment.paidAmount = booking.pricing.totalAmount;
    booking.payment.paidAt = new Date();

    await booking.save({ validateBeforeSave: false });


    return res.status(200).json({
      status: 'success',
      message: 'Booking confirmed'
    });
  }

  // Handle other webhook events if needed
  return res.status(200).json({
    status: 'success',
    message: 'Webhook received'
  });
});

// Guest reviews host/listing after booking
const reviewHostAfterBooking = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const {
    rating,
    comment,
    cleanliness,
    communication,
    checkIn,
    accuracy,
    location,
    value
  } = req.body;

  const booking = await Booking.findById(id)
    .populate('listing')
    .populate('host')
    .populate('guest');

  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  // Verify the user is the guest
  if (booking.guest._id.toString() !== req.user.id) {
    return next(new AppError('You can only review bookings you made', 403));
  }

  // Verify booking is completed
  if (booking.status !== 'completed') {
    return next(new AppError('You can only review completed bookings', 400));
  }

  // Check if already reviewed
  if (booking.guestReview) {
    return next(new AppError('You have already reviewed this booking', 400));
  }

  // Check review window (14 days from checkout)
  const checkoutDate = booking.checkOut && booking.checkOut.actualTime
    ? new Date(booking.checkOut.actualTime)
    : new Date(booking.endDate);
  const now = new Date();
  const daysSinceCheckout = (now.getTime() - checkoutDate.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceCheckout > 14) {
    return next(new AppError('Review period has expired (14 days after checkout)', 400));
  }

  const Review = require('../models/Review');

  // Create review with error handling for duplicates
  let review;
  try {
    review = await Review.create({
      listing: booking.listing._id,
      booking: booking._id,
      reviewer: req.user.id,
      reviewee: booking.host._id,
      type: 'guest_to_host',
      rating: {
        overall: rating,
        cleanliness: cleanliness || rating,
        communication: communication || rating,
        checkIn: checkIn || rating,
        accuracy: accuracy || rating,
        location: location || rating,
        value: value || rating
      },
      comment,
      status: 'published',
      publishedAt: new Date()
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new AppError('You have already reviewed this booking', 400));
    }
    throw error;
  }

  // Update booking with review reference
  booking.guestReview = review._id;
  await booking.save({ validateBeforeSave: false });

  // Update listing stats
  const allReviews = await Review.find({ listing: booking.listing._id, status: 'published', type: 'guest_to_host' });
  if (allReviews.length > 0) {
    const totalRating = allReviews.reduce((sum, r) => sum + (r.rating.overall || r.rating || 0), 0);
    const averageRating = totalRating / allReviews.length;

    if (!booking.listing.stats) booking.listing.stats = {};
    booking.listing.stats.averageRating = Math.round(averageRating * 10) / 10;
    booking.listing.stats.reviewCount = allReviews.length;
    await booking.listing.save({ validateBeforeSave: false });
  }

  // Update host stats
  const User = require('../models/User');
  const host = await User.findById(booking.host._id);
  if (host) {
    const hostReviews = await Review.find({
      type: 'guest_to_host',
      reviewee: host._id,
      status: 'published'
    });
    if (hostReviews.length > 0) {
      const hostTotalRating = hostReviews.reduce((sum, r) => sum + (r.rating.overall || r.rating || 0), 0);
      const hostAvgRating = hostTotalRating / hostReviews.length;

      if (!host.stats) host.stats = {};
      host.stats.averageRating = Math.round(hostAvgRating * 10) / 10;
      host.stats.totalReviews = hostReviews.length;
      await host.save({ validateBeforeSave: false });
    }
  }

  res.status(201).json({
    status: 'success',
    message: 'Review submitted successfully',
    data: {
      review
    }
  });
});

// Host reviews guest after booking
const reviewGuestAfterBooking = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  const booking = await Booking.findById(id)
    .populate('guest')
    .populate('host')
    .populate('listing');

  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  // Verify the user is the host
  if (booking.host._id.toString() !== req.user.id) {
    return next(new AppError('You can only review bookings at your listings', 403));
  }

  // Verify booking is completed
  if (booking.status !== 'completed') {
    return next(new AppError('You can only review completed bookings', 400));
  }

  // Check if already reviewed
  if (booking.hostReview) {
    return next(new AppError('You have already reviewed this guest', 400));
  }

  // Check review window (14 days from checkout)
  const checkoutDate = booking.checkOut && booking.checkOut.actualTime
    ? new Date(booking.checkOut.actualTime)
    : new Date(booking.endDate);
  const now = new Date();
  const daysSinceCheckout = (now.getTime() - checkoutDate.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceCheckout > 14) {
    return next(new AppError('Review period has expired (14 days after checkout)', 400));
  }

  const Review = require('../models/Review');

  // Create review for guest with error handling for duplicates
  let review;
  try {
    review = await Review.create({
      listing: booking.listing._id,
      booking: booking._id,
      reviewer: req.user.id,
      reviewee: booking.guest._id,
      type: 'host_to_guest',
      rating: {
        overall: rating
      },
      comment,
      status: 'published',
      publishedAt: new Date()
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new AppError('You have already reviewed this guest', 400));
    }
    throw error;
  }

  // Update booking with review reference
  booking.hostReview = review._id;
  await booking.save({ validateBeforeSave: false });

  // Update guest stats
  const User = require('../models/User');
  const guest = await User.findById(booking.guest._id);
  if (guest) {
    const guestReviews = await Review.find({
      type: 'host_to_guest',
      reviewee: guest._id,
      status: 'published'
    });
    if (guestReviews.length > 0) {
      const guestTotalRating = guestReviews.reduce((sum, r) => sum + (r.rating.overall || r.rating || 0), 0);
      const guestAvgRating = guestTotalRating / guestReviews.length;

      if (!guest.stats) guest.stats = {};
      guest.stats.averageRating = Math.round(guestAvgRating * 10) / 10;
      guest.stats.totalReviews = guestReviews.length;
      await guest.save({ validateBeforeSave: false });
    }
  }

  res.status(201).json({
    status: 'success',
    message: 'Review submitted successfully',
    data: {
      review
    }
  });
});

// Retry payment for failed booking
const retryBookingPayment = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const booking = await Booking.findById(id)
    .populate('listing', 'title category images address pricing availability')
    .populate('guest', 'firstName lastName email phone address');

  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  // Check if user is the guest
  if (booking.guest._id.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to retry payment for this booking', 403));
  }

  // Check if booking is in pending_payment status or payment failed
  if (booking.status !== 'pending_payment' && booking.payment.status !== 'failed') {
    return next(new AppError('This booking does not require payment retry', 400));
  }

  // Get guest details
  const guest = booking.guest;
  const listing = booking.listing;
  const moment = require('moment');

  // Calculate total amount (subtotal + cleaning fee + service fee)
  const serviceFeeAmount = booking.pricing.guestServiceFee || booking.pricing.serviceFee || 0;
  const totalAmount = Math.round(
    booking.pricing.subtotal +
    (booking.pricing.cleaningFee || 0) +
    serviceFeeAmount
  );

  // Determine payment provider based on currency
  const currency = booking.pricing.currency || 'DZD';
  const isEUR = currency.toUpperCase() === 'EUR';

  try {
    let paymentResponse;

    if (isEUR) {
      // STRIPE for EUR payments
      const stripeService = require('../services/stripeService');

      const paymentIntent = await stripeService.createPaymentIntent({
        amount: totalAmount,
        currency: 'eur',
        bookingId: booking._id.toString(),
        guestEmail: guest.email,
        guestName: `${guest.firstName} ${guest.lastName}`,
        listingTitle: listing.title,
        metadata: {
          retry: 'true',
          startDate: moment(booking.startDate).format('YYYY-MM-DD'),
          endDate: moment(booking.endDate).format('YYYY-MM-DD')
        }
      });

      // Update booking with Stripe Payment Intent
      booking.payment.stripePaymentIntentId = paymentIntent.paymentIntentId;
      booking.payment.transactionId = paymentIntent.paymentIntentId;
      booking.payment.method = 'stripe';
      booking.payment.status = 'pending';
      booking.status = 'pending_payment';
      await booking.save({ validateBeforeSave: false });

      paymentResponse = {
        provider: 'stripe',
        clientSecret: paymentIntent.clientSecret,
        publishableKey: stripeService.getPublishableKey(),
        paymentIntentId: paymentIntent.paymentIntentId
      };
    } else {
      // SLICKPAY for DZD payments
      const slickPayService = require('../services/slickPayService');

      const invoiceResult = await slickPayService.createInvoice({
        amount: totalAmount,
        returnUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/booking/${booking._id}/confirmation`,
        guest: {
          firstName: guest.firstName,
          lastName: guest.lastName,
          email: guest.email,
          phone: guest.phone || '',
          address: guest.address || 'Algiers, Algeria'
        },
        items: [
          {
            name: `Réservation - ${listing.title}`,
            price: booking.pricing.subtotal,
            quantity: 1
          },
          {
            name: 'Frais de ménage',
            price: booking.pricing.cleaningFee || 0,
            quantity: 1
          },
          {
            name: 'Frais de service Baytup',
            price: serviceFeeAmount,
            quantity: 1
          }
        ],
        bookingId: booking._id.toString(),
        note: `Réessai paiement - ${moment(booking.startDate).format('DD/MM/YYYY')} au ${moment(booking.endDate).format('DD/MM/YYYY')}`
      });

      // Update booking with SlickPay invoice ID
      booking.payment.transactionId = invoiceResult.invoiceId;
      booking.payment.method = 'slickpay';
      booking.payment.status = 'pending';
      booking.status = 'pending_payment';
      await booking.save({ validateBeforeSave: false });

      paymentResponse = {
        provider: 'slickpay',
        invoiceId: invoiceResult.invoiceId,
        paymentUrl: invoiceResult.paymentUrl
      };
    }

    res.status(200).json({
      status: 'success',
      message: 'Payment initiated successfully',
      data: {
        booking,
        payment: paymentResponse
      }
    });
  } catch (error) {
    return next(new AppError(`Payment processing error: ${error.message}`, 500));
  }
});

// Host marks guest as checked-in
const checkInGuest = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { notes } = req.body;

  const booking = await Booking.findById(id)
    .populate('listing', 'title')
    .populate('guest', 'firstName lastName email')
    .populate('host', 'firstName lastName email');

  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  // Only host can check-in guest
  if (booking.host._id.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('Only the host can mark guest as checked-in', 403));
  }

  // Check if booking is paid (allow both 'paid' and 'active' status)
  if (booking.status !== 'paid' && booking.status !== 'active') {
    return next(new AppError(`Booking must be paid before check-in. Current status: ${booking.status}`, 400));
  }

  // Check if already checked in
  if (booking.checkIn && booking.checkIn.actualTime) {
    return next(new AppError('Guest has already been checked in', 400));
  }

  // Update check-in information
  if (!booking.checkIn) {
    booking.checkIn = {};
  }

  booking.checkIn.actualTime = new Date();
  booking.checkIn.confirmedBy = req.user.id;
  booking.checkIn.notes = notes || '';

  // Update status to active
  booking.status = 'active';

  // Mark modified to ensure Mongoose saves the subdocument
  booking.markModified('checkIn');

  await booking.save({ validateBeforeSave: false });

  // Create check-in notifications
  try {
    // Notify guest
    await Notification.createNotification({
      recipient: booking.guest._id,
      type: 'booking_check_in',
      title: 'Checked In! 🏠',
      message: `You have been checked in to "${booking.listing.title}". Enjoy your stay!`,
      data: {
        bookingId: booking._id,
        listingTitle: booking.listing.title,
        checkInTime: booking.checkIn.actualTime
      },
      link: `/dashboard/bookings/${booking._id}`,
      priority: 'normal'
    });

    // Notify host
    await Notification.createNotification({
      recipient: booking.host._id,
      type: 'booking_check_in',
      title: 'Guest Checked In! ✅',
      message: `${booking.guest.firstName} ${booking.guest.lastName} has been checked in to "${booking.listing.title}".`,
      data: {
        bookingId: booking._id,
        listingTitle: booking.listing.title,
        guestName: `${booking.guest.firstName} ${booking.guest.lastName}`,
        checkInTime: booking.checkIn.actualTime
      },
      link: `/dashboard/host/bookings/${booking._id}`,
      priority: 'normal'
    });
  } catch (notificationError) {
    console.error('Error creating check-in notifications:', notificationError);
  }

  res.status(200).json({
    status: 'success',
    message: 'Guest checked in successfully',
    data: {
      booking
    }
  });
});

// Host marks guest as checked-out
const checkOutGuest = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { notes, damageReport } = req.body;

  const booking = await Booking.findById(id)
    .populate('listing', 'title')
    .populate('guest', 'firstName lastName email')
    .populate('host', 'firstName lastName email');

  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  // Only host can check-out guest
  if (booking.host._id.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new AppError('Only the host can mark guest as checked-out', 403));
  }

  // Check if booking is active or paid (allow checkout even if status is still 'paid')
  if (booking.status !== 'active' && booking.status !== 'paid') {
    return next(new AppError(`Booking must be active for check-out. Current status: ${booking.status}`, 400));
  }

  // Check if already checked out
  if (booking.checkOut && booking.checkOut.actualTime) {
    return next(new AppError('Guest has already been checked out', 400));
  }

  // Check if checked in (only warning, not blocking - allow direct checkout)
  if (!booking.checkIn || !booking.checkIn.actualTime) {
    // Auto check-in before checkout if not already checked in
    if (!booking.checkIn) {
      booking.checkIn = {};
    }
    booking.checkIn.actualTime = new Date();
    booking.checkIn.confirmedBy = req.user.id;
    booking.checkIn.notes = 'Auto checked-in during checkout';
    booking.markModified('checkIn');
  }

  // Update check-out information
  if (!booking.checkOut) {
    booking.checkOut = {};
  }

  booking.checkOut.actualTime = new Date();
  booking.checkOut.confirmedBy = req.user.id;
  booking.checkOut.notes = notes || '';
  booking.checkOut.damageReport = damageReport || '';

  // Mark modified to ensure Mongoose saves the subdocument
  booking.markModified('checkOut');

  await booking.save({ validateBeforeSave: false });

  // Create check-out notifications
  try {
    // Notify guest
    await Notification.createNotification({
      recipient: booking.guest._id,
      type: 'booking_check_out',
      title: 'Checked Out! 👋',
      message: `You have been checked out from "${booking.listing.title}". Thank you for your stay! Please leave a review.`,
      data: {
        bookingId: booking._id,
        listingTitle: booking.listing.title,
        checkOutTime: booking.checkOut.actualTime
      },
      link: `/dashboard/bookings/${booking._id}`,
      priority: 'normal'
    });

    // Notify host
    await Notification.createNotification({
      recipient: booking.host._id,
      type: 'booking_check_out',
      title: 'Guest Checked Out! 👋',
      message: `${booking.guest.firstName} ${booking.guest.lastName} has been checked out from "${booking.listing.title}".`,
      data: {
        bookingId: booking._id,
        listingTitle: booking.listing.title,
        guestName: `${booking.guest.firstName} ${booking.guest.lastName}`,
        checkOutTime: booking.checkOut.actualTime,
        damageReport: booking.checkOut.damageReport || 'None'
      },
      link: `/dashboard/host/bookings/${booking._id}`,
      priority: 'normal'
    });
  } catch (notificationError) {
    console.error('Error creating check-out notifications:', notificationError);
  }

  res.status(200).json({
    status: 'success',
    message: 'Guest checked out successfully',
    data: {
      booking
    }
  });
});

// Host or Guest confirms booking completion
const confirmBookingCompletion = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const booking = await Booking.findById(id)
    .populate('listing', 'title')
    .populate('guest', 'firstName lastName email')
    .populate('host', 'firstName lastName email');

  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  const isHost = booking.host._id.toString() === req.user.id;
  const isGuest = booking.guest._id.toString() === req.user.id;

  // Check permissions
  if (!isHost && !isGuest && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to confirm this booking completion', 403));
  }

  // Check if guest has checked out
  if (!booking.checkOut || !booking.checkOut.actualTime) {
    return next(new AppError('Guest must be checked out before completion confirmation', 400));
  }

  // Initialize completion object if it doesn't exist
  if (!booking.completion) {
    booking.completion = {
      hostConfirmed: false,
      guestConfirmed: false
    };
  }

  // Update confirmation based on user role
  if (isHost || req.user.role === 'admin') {
    if (booking.completion.hostConfirmed) {
      return next(new AppError('Host has already confirmed completion', 400));
    }
    booking.completion.hostConfirmed = true;
    booking.completion.hostConfirmedAt = new Date();
  } else if (isGuest) {
    if (booking.completion.guestConfirmed) {
      return next(new AppError('Guest has already confirmed completion', 400));
    }
    booking.completion.guestConfirmed = true;
    booking.completion.guestConfirmedAt = new Date();
  }

  // Mark modified to ensure Mongoose saves the subdocument
  booking.markModified('completion');

  // Check if both have confirmed
  if (booking.completion.hostConfirmed && booking.completion.guestConfirmed) {
    booking.status = 'completed';
    booking.completion.completedAt = new Date();
  }

  await booking.save({ validateBeforeSave: false });

  // Create notifications for completion
  try {
    if (booking.status === 'completed') {
      // Both confirmed - notify both
      await Notification.createNotification({
        recipient: booking.guest._id,
        type: 'booking_completed',
        title: 'Booking Completed! 🎉',
        message: `Your booking for "${booking.listing.title}" is now completed. Please leave a review to share your experience!`,
        data: {
          bookingId: booking._id,
          listingTitle: booking.listing.title,
          completedAt: booking.completion.completedAt
        },
        link: `/dashboard/bookings/${booking._id}`,
        priority: 'normal'
      });

      await Notification.createNotification({
        recipient: booking.host._id,
        type: 'booking_completed',
        title: 'Booking Completed! 🎉',
        message: `The booking for "${booking.listing.title}" with ${booking.guest.firstName} ${booking.guest.lastName} is now completed.`,
        data: {
          bookingId: booking._id,
          listingTitle: booking.listing.title,
          guestName: `${booking.guest.firstName} ${booking.guest.lastName}`,
          completedAt: booking.completion.completedAt
        },
        link: `/dashboard/host/bookings/${booking._id}`,
        priority: 'normal'
      });
    }
  } catch (notificationError) {
    console.error('Error creating completion notifications:', notificationError);
  }

  const message = booking.status === 'completed'
    ? 'Booking marked as completed! Both parties have confirmed.'
    : `Your confirmation has been recorded. Waiting for ${isHost ? 'guest' : 'host'} confirmation.`;

  res.status(200).json({
    status: 'success',
    message,
    data: {
      booking,
      bothConfirmed: booking.status === 'completed'
    }
  });
});

// Admin: Get all bookings with filters and pagination
const getAllBookingsAdmin = catchAsync(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(new AppError('Access denied. Admin only.', 403));
  }

  const { status, listing, guest, host, startDate, endDate, page = 1, limit = 20, sort = '-createdAt' } = req.query;

  // Build query
  const query = {};

  if (status) {
    query.status = status;
    console.log(`[getAllBookingsAdmin] Filtering by status: "${status}"`);
  }

  if (listing) {
    query.listing = listing;
  }

  if (guest) {
    query.guest = guest;
  }

  if (host) {
    query.host = host;
  }

  if (startDate || endDate) {
    query.startDate = {};
    if (startDate) query.startDate.$gte = new Date(startDate);
    if (endDate) query.startDate.$lte = new Date(endDate);
  }

  console.log('[getAllBookingsAdmin] Query:', JSON.stringify(query));

  // Execute query with pagination
  const skip = (page - 1) * limit;
  const bookings = await Booking.find(query)
    .populate('listing', 'title category subcategory images address pricing')
    .populate('guest', 'firstName lastName avatar')
    .populate('host', 'firstName lastName avatar')
    .populate('guestReview', 'rating comment status')
    .populate('hostReview', 'rating comment status')
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  console.log(`[getAllBookingsAdmin] Found ${bookings.length} bookings`);
  if (status && bookings.length === 0) {
    console.warn(`[getAllBookingsAdmin] ⚠️ No bookings found with status "${status}"`);
  }

  const total = await Booking.countDocuments(query);
  console.log(`[getAllBookingsAdmin] Total matching bookings: ${total}`);

  // Get statistics
  const stats = {
    total: await Booking.countDocuments(),
    pending: await Booking.countDocuments({ status: 'pending' }),
    confirmed: await Booking.countDocuments({ status: 'confirmed' }),
    active: await Booking.countDocuments({ status: 'active' }),
    completed: await Booking.countDocuments({ status: 'completed' }),
    cancelled: await Booking.countDocuments({ status: { $regex: 'cancelled' } }),
    payment_pending: await Booking.countDocuments({ 'payment.status': 'pending' }),
    payment_completed: await Booking.countDocuments({ 'payment.status': 'completed' })
  };

  const sanitizedBookings = sanitizeBookingsArray(bookings, req.user.id, req.user.role);

  res.status(200).json({
    status: 'success',
    results: sanitizedBookings.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    },
    stats,
    data: {
      bookings: sanitizedBookings
    }
  });
});

// ============ CASH PAYMENT (NORD EXPRESS) METHODS ============

/**
 * Create booking with cash payment (Nord Express voucher)
 * @route POST /api/bookings/create-with-cash
 * @access Private
 */
const createBookingWithCashPayment = catchAsync(async (req, res, next) => {
  const {
    listing: listingId,
    startDate,
    endDate,
    guestCount,
    specialRequests
  } = req.body;

  // Get listing details
  const listingDoc = await Listing.findById(listingId);
  if (!listingDoc) {
    return next(new AppError('Listing not found', 404));
  }

  // Only DZD listings can use cash payment
  if (listingDoc.pricing.currency !== 'DZD') {
    return next(new AppError('Cash payment is only available for DZD listings', 400));
  }

  if (listingDoc.status !== 'active') {
    return next(new AppError('This listing is not available for booking', 400));
  }

  if (listingDoc.host.toString() === req.user.id) {
    return next(new AppError('You cannot book your own listing', 400));
  }

  // Check availability
  const isAvailable = await Booking.checkAvailability(listingId, new Date(startDate), new Date(endDate));
  if (!isAvailable) {
    return next(new AppError('This listing is not available for the selected dates', 400));
  }

  // Calculate duration
  const start = moment(startDate);
  const end = moment(endDate);
  const nights = end.diff(start, 'days');

  if (nights < listingDoc.availability.minStay) {
    return next(new AppError(`Minimum stay is ${listingDoc.availability.minStay} nights`, 400));
  }

  if (nights > listingDoc.availability.maxStay) {
    return next(new AppError(`Maximum stay is ${listingDoc.availability.maxStay} nights`, 400));
  }

  // Calculate pricing - Baytup Fee Structure: 8% guest + 3% host (11% total)
  const basePrice = listingDoc.pricing.basePrice;
  const subtotal = basePrice * nights;
  const cleaningFee = listingDoc.pricing.cleaningFee || 0;
  const baseAmount = subtotal + cleaningFee;

  // Guest Service Fee: 8% of (subtotal + cleaningFee) - charged to guest
  const guestServiceFee = Math.round(baseAmount * GUEST_SERVICE_FEE_RATE);
  // Host Commission: 3% of (subtotal + cleaningFee) - deducted from host payout (internal)
  const hostCommission = Math.round(baseAmount * HOST_COMMISSION_RATE);
  // Legacy field for backward compatibility
  const serviceFee = guestServiceFee;
  // No taxes - hosts are responsible for their own tax declarations
  const taxes = 0;
  // Total paid by guest = subtotal + cleaningFee + guestServiceFee
  const totalAmount = subtotal + cleaningFee + guestServiceFee;

  // Get guest details
  const guest = await User.findById(req.user.id);

  // ✅ FIX: Validate guest has required info for cash payment (required by Nord Express)
  if (!guest.phone || guest.phone.trim() === '') {
    return next(new AppError('Un numéro de téléphone est requis pour le paiement en espèces. Veuillez mettre à jour votre profil.', 400));
  }
  if (!guest.firstName || !guest.lastName) {
    return next(new AppError('Votre nom complet est requis pour le paiement en espèces. Veuillez mettre à jour votre profil.', 400));
  }

  // Create booking with pending_payment status
  const booking = await Booking.create({
    listing: listingId,
    guest: req.user.id,
    host: listingDoc.host,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    checkInTime: listingDoc.availability.checkInFrom,
    checkOutTime: listingDoc.availability.checkOutBefore,
    guestCount: {
      adults: guestCount?.adults || 1,
      children: guestCount?.children || 0,
      infants: guestCount?.infants || 0
    },
    pricing: {
      basePrice,
      nights,
      subtotal,
      cleaningFee,
      guestServiceFee,
      hostCommission,
      serviceFee, // Legacy field = guestServiceFee
      taxes,
      totalAmount,
      hostPayout: baseAmount - hostCommission,
      platformRevenue: guestServiceFee + hostCommission,
      currency: 'DZD',
      securityDeposit: listingDoc.pricing.securityDeposit || 0
    },
    payment: {
      method: 'nord_express',
      status: 'pending'
    },
    status: 'pending_payment',
    specialRequests: specialRequests || ''
  });

  try {
    // Create cash voucher
    const nordExpressService = require('../services/nordExpressService');
    const voucher = await nordExpressService.createVoucher({
      booking,
      amount: totalAmount,
      guestInfo: {
        fullName: `${guest.firstName} ${guest.lastName}`,
        phone: guest.phone || '',
        email: guest.email,
        nationalId: ''
      }
    });

    // Populate booking details
    await booking.populate('listing', 'title category images address pricing');
    await booking.populate('host', 'firstName lastName avatar email');

    // Create notifications
    try {
      await Notification.createNotification({
        recipient: req.user.id,
        type: 'booking_created',
        title: 'Bon de paiement créé!',
        message: `Votre bon de paiement pour "${booking.listing.title}" a été créé. Rendez-vous dans une agence Nord Express pour payer.`,
        data: {
          bookingId: booking._id,
          voucherNumber: voucher.voucherNumber,
          amount: totalAmount,
          expiresAt: voucher.expiresAt
        },
        link: `/dashboard/bookings/${booking._id}`,
        priority: 'high'
      });
    } catch (notificationError) {
      console.error('Error creating booking notification:', notificationError);
    }

    res.status(201).json({
      status: 'success',
      data: {
        booking,
        payment: {
          provider: 'nord_express',
          voucherNumber: voucher.voucherNumber,
          amount: voucher.amount,
          currency: voucher.currency,
          expiresAt: voucher.expiresAt,
          qrCode: voucher.qrCode,
          instructions: voucher.instructions
        }
      }
    });
  } catch (error) {
    await booking.deleteOne();
    console.error('[CashPayment] Voucher creation failed:', error);
    // Provide clearer error message for validation errors
    if (error.name === 'ValidationError') {
      const fields = Object.keys(error.errors).map(key => error.errors[key].message).join('; ');
      return next(new AppError(`Erreur de création du bon de paiement: ${fields}`, 400));
    }
    return next(new AppError(`Erreur de paiement: ${error.message}`, 500));
  }
});

/**
 * Get voucher details
 * @route GET /api/bookings/voucher/:voucherNumber
 * @access Private
 */
const getVoucherDetails = catchAsync(async (req, res, next) => {
  const { voucherNumber } = req.params;

  const nordExpressService = require('../services/nordExpressService');
  const details = await nordExpressService.getVoucherDetails(voucherNumber);

  if (!details) {
    return next(new AppError('Voucher not found', 404));
  }

  // Check if user has access
  const CashVoucher = require('../models/CashVoucher');
  const voucher = await CashVoucher.findOne({ voucherNumber }).populate('booking');

  if (!voucher) {
    return next(new AppError('Voucher not found', 404));
  }

  const isGuest = voucher.booking.guest.toString() === req.user.id;
  const isHost = voucher.booking.host.toString() === req.user.id;
  const isAdmin = req.user.role === 'admin';

  if (!isGuest && !isHost && !isAdmin) {
    return next(new AppError('You do not have permission to view this voucher', 403));
  }

  res.status(200).json({
    status: 'success',
    data: details
  });
});

/**
 * Admin: Get all pending cash vouchers
 * @route GET /api/admin/cash-vouchers
 * @access Admin
 */
const getPendingCashVouchers = catchAsync(async (req, res, next) => {
  const nordExpressService = require('../services/nordExpressService');
  const vouchers = await nordExpressService.getPendingVouchers();

  res.status(200).json({
    status: 'success',
    results: vouchers.length,
    data: { vouchers }
  });
});

/**
 * Admin: Manually validate cash payment
 * @route PUT /api/admin/cash-vouchers/:id/validate
 * @access Admin
 */
const validateCashPayment = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { agencyCode, transactionId, notes } = req.body;

  const nordExpressService = require('../services/nordExpressService');

  try {
    const voucher = await nordExpressService.validatePaymentManually(id, {
      adminId: req.user.id,
      agencyCode,
      transactionId,
      notes
    });

    res.status(200).json({
      status: 'success',
      message: 'Cash payment validated successfully',
      data: { voucher }
    });
  } catch (error) {
    return next(new AppError(error.message, 400));
  }
});

module.exports = {
  getGuestBookings,
  getBooking,
  createBooking,
  updateBooking,
  cancelBooking,
  deleteBooking,
  getBookingCalendar,
  getBookingStats,
  getTravelHistory,
  addReviewToBooking,
  getTravelHistoryStats,
  getHostBookings,
  getHostBookingsCalendar,
  updateBookingStatus,
  createBookingWithPayment,
  verifyPaymentAndConfirmBooking,
  handlePaymentWebhook,
  reviewHostAfterBooking,
  reviewGuestAfterBooking,
  retryBookingPayment,
  checkInGuest,
  getAllBookingsAdmin,
  checkOutGuest,
  confirmBookingCompletion,
  // Cash payment (Nord Express)
  createBookingWithCashPayment,
  getVoucherDetails,
  getPendingCashVouchers,
  validateCashPayment
};