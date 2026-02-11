const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');
const Booking = require('../models/Booking');
const Listing = require('../models/Listing');
const Payout = require('../models/Payout');
const { HOST_COMMISSION_RATE } = require('../config/fees');

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
  const hostCommission = booking.pricing.hostCommission || Math.round(baseAmount * HOST_COMMISSION_RATE);
  return baseAmount - hostCommission;
};

// @desc    Get host's earnings overview
// @route   GET /api/earnings/overview
// @access  Private (Host only)
exports.getEarningsOverview = catchAsync(async (req, res, next) => {
  const hostId = req.user.id;

  // Get all paid and completed bookings for the host
  const allPaidBookings = await Booking.find({
    host: hostId,
    status: { $in: ['confirmed', 'paid', 'active', 'completed'] },
    'payment.status': 'paid'
  }).populate('listing', 'title category');

  // Calculate host's total earnings (with 3% commission deducted)
  const totalEarnings = allPaidBookings.reduce((sum, booking) => {
    return sum + calculateHostEarning(booking);
  }, 0);

  // Get pending bookings (confirmed but payment not yet marked as paid)
  const pendingBookings = await Booking.find({
    host: hostId,
    status: { $in: ['pending_payment', 'confirmed'] },
    'payment.status': { $in: ['pending', 'authorized'] }
  });

  const pendingBalance = pendingBookings.reduce((sum, booking) => {
    return sum + calculateHostEarning(booking);
  }, 0);

  // Calculate this month's earnings (based on payment date)
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);

  const monthlyBookings = allPaidBookings.filter(booking => {
    const paidDate = booking.payment.paidAt || booking.updatedAt;
    return paidDate >= startOfMonth && paidDate <= endOfMonth;
  });

  const monthlyEarnings = monthlyBookings.reduce((sum, booking) => {
    return sum + calculateHostEarning(booking);
  }, 0);

  // Get completed bookings (available for withdrawal)
  const completedBookings = await Booking.find({
    host: hostId,
    status: 'completed',
    'payment.status': 'paid'
  });

  const completedEarnings = completedBookings.reduce((sum, booking) => {
    return sum + calculateHostEarning(booking);
  }, 0);

  // Get all payouts (completed, processing, or pending) to calculate actual available balance
  const payouts = await Payout.find({
    host: hostId,
    status: { $in: ['completed', 'processing', 'pending'] }
  });

  const totalWithdrawn = payouts.reduce((sum, payout) => {
    return sum + payout.amount;
  }, 0);

  // Available balance = completed earnings - already withdrawn/requested amounts
  const availableBalance = Math.max(0, completedEarnings - totalWithdrawn);

  // Calculate counts
  const totalTransactions = allPaidBookings.length;
  const paidTransactions = completedBookings.length;
  const pendingTransactions = pendingBookings.length;
  const averageEarningPerBooking = totalTransactions > 0 ? totalEarnings / totalTransactions : 0;

  res.status(200).json({
    success: true,
    data: {
      totalEarnings: Math.round(totalEarnings),
      monthlyEarnings: Math.round(monthlyEarnings),
      availableBalance: Math.round(availableBalance),
      pendingBalance: Math.round(pendingBalance),
      totalTransactions,
      paidTransactions,
      pendingTransactions,
      averageEarningPerBooking: Math.round(averageEarningPerBooking),
      currency: 'DZD'
    }
  });
});

// @desc    Get host's earnings transactions
// @route   GET /api/earnings/transactions
// @access  Private (Host only)
exports.getEarningsTransactions = catchAsync(async (req, res, next) => {
  const hostId = req.user.id;
  const { paymentStatus, listingId, startDate, endDate, page = 1, limit = 20 } = req.query;

  // Build query
  let query = {
    host: hostId
  };

  // Filter by payment status
  if (paymentStatus && paymentStatus !== 'all') {
    query['payment.status'] = paymentStatus;
  } else {
    // Default: show only paid transactions
    query['payment.status'] = 'paid';
  }

  // Filter by booking status
  query.status = { $in: ['confirmed', 'paid', 'active', 'completed'] };

  // Filter by listing
  if (listingId) {
    query.listing = listingId;
  }

  // Filter by date range (using payment date)
  if (startDate || endDate) {
    query['payment.paidAt'] = {};
    if (startDate) {
      query['payment.paidAt'].$gte = new Date(startDate);
    }
    if (endDate) {
      query['payment.paidAt'].$lte = new Date(endDate);
    }
  }

  // Get bookings with pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const transactions = await Booking.find(query)
    .populate('listing', 'title category images address')
    .populate('guest', 'firstName lastName avatar')
    .sort('-payment.paidAt -createdAt')
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Booking.countDocuments(query);

  // Format transactions with correct earnings breakdown
  // Baytup Fee Structure: 8% guest service fee + 3% host commission = 11% total
  const formattedTransactions = transactions.map(booking => {
    const baseAmount = booking.pricing.subtotal + (booking.pricing.cleaningFee || 0);
    // Host commission is 3% of baseAmount (deducted from host payout)
    const hostCommission = booking.pricing.hostCommission || Math.round(baseAmount * HOST_COMMISSION_RATE);
    // Host receives: baseAmount - 3% commission
    const hostEarning = booking.pricing.hostPayout || (baseAmount - hostCommission);
    // Platform revenue: 8% guest fee + 3% host commission
    const guestServiceFee = booking.pricing.guestServiceFee || booking.pricing.serviceFee || 0;
    const platformFee = booking.pricing.platformRevenue || (guestServiceFee + hostCommission);

    return {
      _id: booking._id,
      listing: booking.listing,
      guest: booking.guest,
      bookingDates: {
        startDate: booking.startDate,
        endDate: booking.endDate,
        nights: booking.pricing.nights
      },
      earnings: {
        subtotal: booking.pricing.subtotal,
        cleaningFee: booking.pricing.cleaningFee || 0,
        hostCommission,
        hostEarning,
        guestServiceFee,
        platformFee,
        totalAmount: booking.pricing.totalAmount,
        currency: booking.pricing.currency
      },
      payment: {
        method: booking.payment.method,
        status: booking.payment.status,
        paidAt: booking.payment.paidAt,
        transactionId: booking.payment.transactionId
      },
      status: booking.status,
      createdAt: booking.createdAt
    };
  });

  res.status(200).json({
    success: true,
    count: formattedTransactions.length,
    data: {
      transactions: formattedTransactions
    },
    pagination: {
      total,
      pages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      limit: parseInt(limit)
    }
  });
});

// @desc    Get earnings by listing
// @route   GET /api/earnings/by-listing
// @access  Private (Host only)
exports.getEarningsByListing = catchAsync(async (req, res, next) => {
  const hostId = req.user.id;

  // Get all host's listings
  const listings = await Listing.find({ host: hostId }).select('title category images');

  // Get earnings for each listing
  const earningsByListing = await Promise.all(
    listings.map(async (listing) => {
      const bookings = await Booking.find({
        listing: listing._id,
        host: hostId,
        status: { $in: ['confirmed', 'paid', 'active', 'completed'] },
        'payment.status': 'paid'
      });

      const totalEarnings = bookings.reduce((sum, booking) => {
        return sum + calculateHostEarning(booking);
      }, 0);

      const totalBookings = bookings.length;
      const averageEarning = totalBookings > 0 ? totalEarnings / totalBookings : 0;

      return {
        listingId: listing._id.toString(),
        listingTitle: listing.title,
        listingCategory: listing.category,
        listingImage: listing.images?.[0]?.url || null,
        totalEarnings: Math.round(totalEarnings),
        bookingCount: totalBookings,
        averageEarning: Math.round(averageEarning),
        currency: 'DZD'
      };
    })
  );

  // Sort by earnings (highest first) and filter out listings with no earnings
  const sortedEarnings = earningsByListing
    .filter(item => item.totalEarnings > 0)
    .sort((a, b) => b.totalEarnings - a.totalEarnings);

  res.status(200).json({
    success: true,
    count: sortedEarnings.length,
    data: {
      earnings: sortedEarnings
    }
  });
});

// @desc    Get earnings statistics by month
// @route   GET /api/earnings/monthly-stats
// @access  Private (Host only)
exports.getMonthlyEarningsStats = catchAsync(async (req, res, next) => {
  const hostId = req.user.id;
  const { year = new Date().getFullYear() } = req.query;

  // Get bookings for the entire year
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);

  const bookings = await Booking.find({
    host: hostId,
    status: { $in: ['confirmed', 'paid', 'active', 'completed'] },
    'payment.status': 'paid',
    'payment.paidAt': {
      $gte: startOfYear,
      $lte: endOfYear
    }
  });

  // Group by month
  const monthlyStats = Array.from({ length: 12 }, (_, i) => {
    const monthBookings = bookings.filter(booking => {
      const paidDate = new Date(booking.payment.paidAt);
      return paidDate.getMonth() === i;
    });

    const earnings = monthBookings.reduce((sum, booking) => {
      return sum + calculateHostEarning(booking);
    }, 0);

    return {
      month: i + 1,
      monthName: new Date(year, i).toLocaleString('en', { month: 'short' }),
      earnings: Math.round(earnings),
      bookings: monthBookings.length,
      currency: 'DZD'
    };
  });

  res.status(200).json({
    success: true,
    data: {
      year: parseInt(year),
      months: monthlyStats
    }
  });
});

// @desc    Get earnings by category (stay vs vehicle)
// @route   GET /api/earnings/by-category
// @access  Private (Host only)
exports.getEarningsByCategory = catchAsync(async (req, res, next) => {
  const hostId = req.user.id;

  const bookings = await Booking.find({
    host: hostId,
    status: { $in: ['confirmed', 'paid', 'active', 'completed'] },
    'payment.status': 'paid'
  }).populate('listing', 'category');

  // Group by category
  const categories = {
    stay: { earnings: 0, bookings: 0 },
    vehicle: { earnings: 0, bookings: 0 }
  };

  bookings.forEach(booking => {
    const category = booking.listing?.category || 'stay';
    const hostEarning = calculateHostEarning(booking);

    if (categories[category]) {
      categories[category].earnings += hostEarning;
      categories[category].bookings += 1;
    }
  });

  res.status(200).json({
    success: true,
    data: {
      stay: {
        earnings: Math.round(categories.stay.earnings),
        bookings: categories.stay.bookings,
        currency: 'DZD'
      },
      vehicle: {
        earnings: Math.round(categories.vehicle.earnings),
        bookings: categories.vehicle.bookings,
        currency: 'DZD'
      }
    }
  });
});
