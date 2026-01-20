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
    specialRequests: specialRequests || ''
  });

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

// Cancel booking
const cancelBooking = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  // Check permission - Allow both guest and host to cancel
  const isGuest = booking.guest.toString() === req.user.id;
  const isHost = booking.host.toString() === req.user.id;
  const isAdmin = req.user.role === 'admin';

  if (!isGuest && !isHost && !isAdmin) {
    return next(new AppError('You do not have permission to cancel this booking', 403));
  }

  // Check if booking can be cancelled
  if (['completed', 'cancelled_by_guest', 'cancelled_by_host', 'cancelled_by_admin'].includes(booking.status)) {
    return next(new AppError('This booking cannot be cancelled', 400));
  }

  const { reason } = req.body;

  // Calculate refund based on cancellation policy
  let refundAmount = 0;
  let cancellationFee = 0;

  const daysUntilCheckIn = moment(booking.startDate).diff(moment(), 'days');

  // Determine who is cancelling
  let cancelledByRole = 'guest';
  if (isHost) {
    cancelledByRole = 'host';
  } else if (isAdmin) {
    cancelledByRole = 'admin';
  }

  // Cancellation policy - more generous for host cancellations
  if (cancelledByRole === 'host') {
    // If host cancels, always full refund to guest
    refundAmount = booking.pricing.totalAmount;
    cancellationFee = 0;
  } else {
    // Guest cancellation policy
    if (daysUntilCheckIn >= 7) {
      // Full refund if cancelled 7+ days before check-in
      refundAmount = booking.pricing.totalAmount;
      cancellationFee = 0;
    } else if (daysUntilCheckIn >= 3) {
      // 50% refund if cancelled 3-6 days before check-in
      refundAmount = booking.pricing.totalAmount * 0.5;
      cancellationFee = booking.pricing.totalAmount * 0.5;
    } else {
      // No refund if cancelled less than 3 days before check-in
      refundAmount = 0;
      cancellationFee = booking.pricing.totalAmount;
    }
  }

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
    booking.payment.status = refundAmount > 0 ? 'refunded' : 'paid';
    booking.payment.refundAmount = refundAmount;
    booking.payment.refundReason = `Cancelled by ${cancelledByRole}: ${reason || `${cancelledByRole}_request`}`;
    booking.payment.refundedAt = new Date();
  }

  await booking.save({ validateBeforeSave: false });

  await booking.populate('listing', 'title category images address pricing');
  await booking.populate('host', 'firstName lastName avatar');
  await booking.populate('guest', 'firstName lastName avatar phone email');

  // Create notifications for cancellation
  try {
    if (cancelledByRole === 'guest') {
      // Notify guest about cancellation
      await Notification.createNotification({
        recipient: booking.guest._id,
        type: 'booking_cancelled_by_guest',
        title: 'Booking Cancelled ❌',
        message: `Your booking for "${booking.listing.title}" has been cancelled. ${refundAmount > 0 ? `You will receive a refund of ${refundAmount} DZD.` : 'No refund is applicable based on the cancellation policy.'}`,
        data: {
          bookingId: booking._id,
          listingTitle: booking.listing.title,
          refundAmount,
          cancellationFee,
          reason: reason || 'guest_request'
        },
        link: `/dashboard/bookings/${booking._id}`,
        priority: 'high'
      });

      // Notify host about guest cancellation
      await Notification.createNotification({
        recipient: booking.host._id,
        type: 'booking_cancelled_by_guest',
        title: 'Booking Cancelled by Guest ❌',
        message: `${booking.guest.firstName} ${booking.guest.lastName} has cancelled their booking for "${booking.listing.title}". ${reason ? `Reason: ${reason}` : ''}`,
        data: {
          bookingId: booking._id,
          listingTitle: booking.listing.title,
          guestName: `${booking.guest.firstName} ${booking.guest.lastName}`,
          reason: reason || 'guest_request'
        },
        link: `/dashboard/host/bookings/${booking._id}`,
        priority: 'high'
      });
    } else if (cancelledByRole === 'host') {
      // Notify guest about host cancellation
      await Notification.createNotification({
        recipient: booking.guest._id,
        type: 'booking_cancelled_by_host',
        title: 'Booking Cancelled by Host ❌',
        message: `Your booking for "${booking.listing.title}" has been cancelled by the host. You will receive a full refund of ${refundAmount} DZD.`,
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
        title: 'Booking Cancelled ❌',
        message: `You have cancelled the booking for "${booking.listing.title}" by ${booking.guest.firstName} ${booking.guest.lastName}. The guest will receive a full refund.`,
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
        cancellationFee,
        daysUntilCheckIn,
        cancelledBy: cancelledByRole,
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
    pending: ['confirmed', 'cancelled_by_host'],
    confirmed: ['paid', 'cancelled_by_host'],
    paid: ['active', 'cancelled_by_host']
  };

  if (!allowedTransitions[booking.status]?.includes(status)) {
    return next(new AppError(`Cannot change status from ${booking.status} to ${status}`, 400));
  }

  booking.status = status;
  if (hostMessage) {
    booking.hostMessage = hostMessage;
  }

  await booking.save({ validateBeforeSave: false });

  await booking.populate('listing', 'title category images address pricing');
  await booking.populate('guest', 'firstName lastName avatar email');
  await booking.populate('host', 'firstName lastName avatar email');

  // Create in-app notifications and send emails based on status change
  try {
    const guest = await User.findById(booking.guest._id);
    const host = await User.findById(booking.host._id);

    if (status === 'confirmed') {
      // Booking approved by host
      // In-app notification to guest
      await Notification.createNotification({
        recipient: booking.guest._id,
        type: 'booking_approved',
        title: 'Booking Approved! ✅',
        message: `Your booking for "${booking.listing.title}" has been approved by the host!`,
        data: {
          bookingId: booking._id,
          listingTitle: booking.listing.title,
          hostName: `${host.firstName} ${host.lastName}`,
          checkIn: booking.startDate,
          checkOut: booking.endDate
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

// Create booking with Slick Pay payment integration
const createBookingWithPayment = catchAsync(async (req, res, next) => {
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

  // Calculate pricing
  const basePrice = listingDoc.pricing.basePrice;
  const subtotal = basePrice * nights;
  const cleaningFee = listingDoc.pricing.cleaningFee || 0;
  const serviceFee = Math.round(subtotal * 0.10); // 10% service fee
  const taxes = Math.round((subtotal + cleaningFee + serviceFee) * 0.05); // 5% taxes
  const totalAmount = subtotal + cleaningFee + serviceFee + taxes;

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
      serviceFee,
      taxes,
      totalAmount,
      currency: listingDoc.pricing.currency,
      securityDeposit: listingDoc.pricing.securityDeposit || 0
    },
    payment: {
      method: 'slickpay',
      status: 'pending'
    },
    status: 'pending_payment',
    specialRequests: specialRequests || ''
  });

  // Get guest details
  const guest = await User.findById(req.user.id);

  // Create Slick Pay invoice
  const slickPayService = require('../services/slickPayService');

  // Prepare invoice items with prices in DZD (Slick Pay expects DZD, not centimes)
  // Use the amounts directly without converting to centimes
  const invoiceItems = [
    {
      name: `${listingDoc.title} - ${nights} night${nights > 1 ? 's' : ''}`,
      price: Math.round(subtotal),
      quantity: 1
    }
  ];

  if (cleaningFee > 0) {
    invoiceItems.push({
      name: 'Cleaning Fee',
      price: Math.round(cleaningFee),
      quantity: 1
    });
  }

  invoiceItems.push({
    name: 'Service Fee (10%)',
    price: Math.round(serviceFee),
    quantity: 1
  });

  invoiceItems.push({
    name: 'Taxes (5%)',
    price: Math.round(taxes),
    quantity: 1
  });

  // Calculate total as sum of all rounded item prices (this ensures exact match)
  const totalAmountForSlickPay = invoiceItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  try {
    const invoice = await slickPayService.createInvoice({
      amount: totalAmountForSlickPay,
      returnUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/booking/${booking._id}/confirmation`,
      guest: {
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email,
        phone: guest.phone || '',
        address: guest.address || 'Algiers, Algeria'
      },
      items: invoiceItems,
      bookingId: booking._id.toString(),
      note: `Booking for ${listingDoc.title} - ${start.format('MMM DD')} to ${end.format('MMM DD, YYYY')}`
    });

    // Update booking with Slick Pay invoice ID
    booking.payment.transactionId = invoice.invoiceId.toString();
    await booking.save({ validateBeforeSave: false });

    // Populate booking details
    await booking.populate('listing', 'title category images address pricing');
    await booking.populate('host', 'firstName lastName avatar email');

    // Create notifications for guest and host
    try {
      // Notify guest
      await Notification.createNotification({
        recipient: req.user.id,
        type: 'booking_created',
        title: 'Booking Created Successfully! 🎉',
        message: `Your booking for "${booking.listing.title}" has been created. Complete the payment to confirm your reservation.`,
        data: {
          bookingId: booking._id,
          listingTitle: booking.listing.title,
          startDate: booking.startDate,
          endDate: booking.endDate,
          totalAmount: booking.pricing.totalAmount
        },
        link: `/dashboard/bookings/${booking._id}`,
        priority: 'high'
      });

      // Notify host
      await Notification.createNotification({
        recipient: booking.host._id,
        type: 'booking_created',
        title: 'New Booking Request! 📅',
        message: `${guest.firstName} ${guest.lastName} has created a booking for "${booking.listing.title}" from ${moment(booking.startDate).format('MMM DD')} to ${moment(booking.endDate).format('MMM DD, YYYY')}. Waiting for payment confirmation.`,
        data: {
          bookingId: booking._id,
          listingTitle: booking.listing.title,
          guestName: `${guest.firstName} ${guest.lastName}`,
          startDate: booking.startDate,
          endDate: booking.endDate,
          totalAmount: booking.pricing.totalAmount
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
        payment: {
          invoiceId: invoice.invoiceId,
          paymentUrl: invoice.paymentUrl,
          message: invoice.message
        }
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

  // Verify payment with Slick Pay
  if (booking.payment.transactionId) {
    const slickPayService = require('../services/slickPayService');

    console.log('🔍 Verifying payment for booking:', {
      bookingId: booking._id,
      transactionId: booking.payment.transactionId,
      currentStatus: booking.payment.status,
      currentBookingStatus: booking.status
    });

    try {
      console.log('📡 Calling Slick Pay API to check invoice status...');
      const invoiceStatus = await slickPayService.getInvoiceStatus(booking.payment.transactionId);

      console.log('✅ Slick Pay API Response:', {
        success: invoiceStatus.success,
        completed: invoiceStatus.completed,
        paymentStatus: invoiceStatus.paymentStatus,
        data: invoiceStatus.data
      });

      if (invoiceStatus.completed && invoiceStatus.paymentStatus === 'paid') {
        // Update booking status
        booking.status = 'confirmed';
        booking.payment.status = 'paid';
        booking.payment.paidAmount = booking.pricing.totalAmount;
        booking.payment.paidAt = new Date();

        await booking.save({ validateBeforeSave: false });

        // Create notifications for successful payment
        try {
          // Notify guest
          await Notification.createNotification({
            recipient: booking.guest._id,
            type: 'booking_payment_successful',
            title: 'Payment Confirmed! ✅',
            message: `Your payment for "${booking.listing.title}" has been confirmed. Your booking is now confirmed!`,
            data: {
              bookingId: booking._id,
              listingTitle: booking.listing.title,
              amount: booking.pricing.totalAmount,
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
            title: 'Booking Confirmed! 🎉',
            message: `${booking.guest.firstName} ${booking.guest.lastName}'s payment has been confirmed for "${booking.listing.title}". The booking is now confirmed.`,
            data: {
              bookingId: booking._id,
              listingTitle: booking.listing.title,
              guestName: `${booking.guest.firstName} ${booking.guest.lastName}`,
              amount: booking.pricing.totalAmount,
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
            paymentStatus: invoiceStatus.paymentStatus
          }
        });
      }
    } catch (error) {
      console.error('❌ Error verifying payment:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        bookingId: booking._id,
        transactionId: booking.payment.transactionId
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

  // Create Slick Pay invoice
  const slickPayService = require('../services/slickPayService');
  const moment = require('moment');

  // Prepare invoice items with prices in DZD
  const invoiceItems = [
    {
      name: `${listing.title} - ${booking.pricing.nights} night${booking.pricing.nights > 1 ? 's' : ''}`,
      price: Math.round(booking.pricing.subtotal),
      quantity: 1
    }
  ];

  if (booking.pricing.cleaningFee > 0) {
    invoiceItems.push({
      name: 'Cleaning Fee',
      price: Math.round(booking.pricing.cleaningFee),
      quantity: 1
    });
  }

  invoiceItems.push({
    name: 'Service Fee (10%)',
    price: Math.round(booking.pricing.serviceFee),
    quantity: 1
  });

  invoiceItems.push({
    name: 'Taxes (5%)',
    price: Math.round(booking.pricing.taxes),
    quantity: 1
  });

  // Calculate total as sum of all rounded item prices
  const totalAmountForSlickPay = invoiceItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  try {
    const invoice = await slickPayService.createInvoice({
      amount: totalAmountForSlickPay,
      returnUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard/bookings/${booking._id}`,
      guest: {
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email,
        phone: guest.phone || '',
        address: guest.address || 'Algiers, Algeria'
      },
      items: invoiceItems,
      bookingId: booking._id.toString(),
      note: `Retry Payment - Booking for ${listing.title} - ${moment(booking.startDate).format('MMM DD')} to ${moment(booking.endDate).format('MMM DD, YYYY')}`
    });

    // Update booking with new Slick Pay invoice ID
    booking.payment.transactionId = invoice.invoiceId.toString();
    booking.payment.status = 'pending';
    booking.status = 'pending_payment';
    await booking.save({ validateBeforeSave: false });

    res.status(200).json({
      status: 'success',
      message: 'Payment invoice created successfully',
      data: {
        booking,
        payment: {
          invoiceId: invoice.invoiceId,
          paymentUrl: invoice.paymentUrl,
          message: invoice.message
        }
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
  confirmBookingCompletion
};