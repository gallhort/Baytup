const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');
const User = require('../models/User');
const Listing = require('../models/Listing');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const { Conversation, Message } = require('../models/Message');
const { startOfDay, startOfMonth, subMonths, subDays, isAfter } = require('date-fns');

// Get Admin Dashboard Data
const getAdminDashboard = catchAsync(async (req, res, next) => {
  try {
    const today = startOfDay(new Date());
    const thisMonth = startOfMonth(new Date());
    const lastMonth = startOfMonth(subMonths(new Date(), 1));
    const last30Days = subDays(new Date(), 30);

    // User statistics
    const totalUsers = await User.countDocuments();
    const activeHosts = await User.countDocuments({ role: 'host', isActive: true });
    const activeGuests = await User.countDocuments({ role: 'guest', isActive: true });
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: thisMonth }
    });

    // Listing statistics
    const totalListings = await Listing.countDocuments();
    const activeListings = await Listing.countDocuments({ status: 'active' });
    const pendingListings = await Listing.countDocuments({ status: 'pending' });
    const featuredListings = await Listing.countDocuments({ featured: true });

    // Booking statistics
    const totalBookings = await Booking.countDocuments();
    const activeBookings = await Booking.countDocuments({
      status: { $in: ['confirmed', 'active'] }
    });
    const completedBookings = await Booking.countDocuments({ status: 'completed' });
    const cancelledBookings = await Booking.countDocuments({ status: 'cancelled' });

    // Revenue statistics - ✅ Fixed
    const revenueData = await Booking.aggregate([
      { 
        $match: { 
          status: { $in: ['paid', 'active', 'completed'] },
          'payment.status': 'paid'
        } 
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$pricing.totalAmount' }, // ✅ Fixed
          totalCommission: { $sum: '$commission' },
          averageBookingValue: { $avg: '$pricing.totalAmount' } // ✅ Fixed
        }
      }
    ]);

    const revenue = revenueData[0] || {
      totalRevenue: 0,
      totalCommission: 0,
      averageBookingValue: 0
    };

    // Monthly revenue trend (last 6 months) - ✅ Fixed
    const monthlyRevenue = await Booking.aggregate([
      {
        $match: {
          status: { $in: ['paid', 'active', 'completed'] },
          'payment.status': 'paid',
          createdAt: { $gte: subMonths(new Date(), 6) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$pricing.totalAmount' }, // ✅ Fixed
          bookings: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Top performing listings
    const topListings = await Listing.find({ status: 'active' })
      .sort('-stats.bookings -stats.averageRating')
      .limit(5)
      .select('title category subcategory stats pricing images host')
      .populate('host', 'firstName lastName avatar');

    // Recent activities
    const recentBookings = await Booking.find()
      .sort('-createdAt')
      .limit(10)
      .populate('guest', 'firstName lastName avatar')
      .populate('listing', 'title category');

    const recentReviews = await Review.find()
      .sort('-createdAt')
      .limit(10)
      .populate('reviewer', 'firstName lastName avatar')
      .populate('listing', 'title');

    // Category distribution
    const categoryDistribution = await Listing.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    // Location distribution
    const locationDistribution = await Listing.aggregate([
      { $group: { _id: '$address.city', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Growth metrics
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: subDays(new Date(), 30) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        overview: {
          totalUsers,
          activeHosts,
          activeGuests,
          newUsersThisMonth,
          totalListings,
          activeListings,
          pendingListings,
          featuredListings,
          totalBookings,
          activeBookings,
          completedBookings,
          cancelledBookings
        },
        revenue: {
          ...revenue,
          monthlyTrend: monthlyRevenue
        },
        topListings,
        recentActivities: {
          bookings: recentBookings,
          reviews: recentReviews
        },
        analytics: {
          categoryDistribution,
          locationDistribution,
          userGrowth
        }
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return next(new AppError('Error fetching admin dashboard data', 500));
  }
});

// Get Host Dashboard Data
const getHostDashboard = catchAsync(async (req, res, next) => {
  try {
    const hostId = req.user.id;
    const today = startOfDay(new Date());
    const thisMonth = startOfMonth(new Date());
    const last30Days = subDays(new Date(), 30);

    // Host's listings
    const myListings = await Listing.find({ host: hostId })
      .select('title category subcategory status stats pricing images createdAt')
      .sort('-createdAt');

    const totalListings = myListings.length;
    const activeListings = myListings.filter(l => l.status === 'active').length;
    const pendingListings = myListings.filter(l => l.status === 'pending').length;

    // Booking statistics for host's listings
    const listingIds = myListings.map(l => l._id);

    const totalBookings = await Booking.countDocuments({
      listing: { $in: listingIds }
    });

    const activeBookings = await Booking.countDocuments({
      listing: { $in: listingIds },
      status: { $in: ['confirmed', 'active'] }
    });

    const upcomingBookings = await Booking.find({
      listing: { $in: listingIds },
      status: 'confirmed',
      checkIn: { $gte: today }
    })
      .sort('checkIn')
      .limit(10)
      .populate('guest', 'firstName lastName avatar phone email')
      .populate('listing', 'title category images');

    // Revenue statistics - ✅ Fixed: using pricing.totalAmount and correct statuses
    const revenueData = await Booking.aggregate([
      {
        $match: {
          listing: { $in: listingIds },
          status: { $in: ['paid', 'active', 'completed'] }, // ✅ Include all paid bookings
          'payment.status': 'paid' // ✅ Ensure payment is completed
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$pricing.totalAmount' }, // ✅ Fixed: correct field name
          totalBookings: { $sum: 1 },
          averageBookingValue: { $avg: '$pricing.totalAmount' } // ✅ Fixed: correct field name
        }
      }
    ]);

    const revenue = revenueData[0] || {
      totalRevenue: 0,
      totalBookings: 0,
      averageBookingValue: 0
    };

    // Monthly revenue trend - ✅ Fixed
    const monthlyRevenue = await Booking.aggregate([
      {
        $match: {
          listing: { $in: listingIds },
          status: { $in: ['paid', 'active', 'completed'] }, // ✅ Fixed
          'payment.status': 'paid', // ✅ Ensure payment is completed
          createdAt: { $gte: subMonths(new Date(), 6) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$pricing.totalAmount' }, // ✅ Fixed: correct field name
          bookings: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Recent reviews for host's listings
    const recentReviews = await Review.find({
      listing: { $in: listingIds }
    })
      .sort('-createdAt')
      .limit(10)
      .populate('reviewer', 'firstName lastName avatar')
      .populate('listing', 'title');

    // Performance metrics
    const totalViews = myListings.reduce((sum, l) => sum + (l.stats?.views || 0), 0);
    const totalFavorites = myListings.reduce((sum, l) => sum + (l.stats?.favorites || 0), 0);
    
    // ✅ Fixed: Only count listings with ratings
    const listingsWithRatings = myListings.filter(l => l.stats?.averageRating && l.stats.averageRating > 0);
    const averageRating = listingsWithRatings.length > 0
      ? listingsWithRatings.reduce((sum, l) => sum + l.stats.averageRating, 0) / listingsWithRatings.length
      : 0;

    // Calendar data for bookings
    const calendarBookings = await Booking.find({
      listing: { $in: listingIds },
      status: { $in: ['confirmed', 'active'] },
      $or: [
        { checkIn: { $gte: today } },
        { checkOut: { $gte: today } }
      ]
    })
      .populate('listing', 'title')
      .populate('guest', 'firstName lastName');

    // Messages/Inquiries
    const conversations = await Conversation.find({
      'participants.user': hostId
    });

    let unreadMessages = 0;
    for (const conv of conversations) {
      const count = await conv.getUnreadCount(hostId);
      unreadMessages += count;
    }

    const recentConversations = await Conversation.find({
      'participants.user': hostId,
      status: 'active'
    })
      .sort('-lastMessage.sentAt')
      .limit(5)
      .populate('participants.user', 'firstName lastName avatar')
      .populate('listing', 'title');

    // Format recent messages
    const recentMessages = recentConversations.map(conv => ({
      _id: conv._id,
      sender: conv.lastMessage.sender,
      content: conv.lastMessage.content,
      createdAt: conv.lastMessage.sentAt
    }));

    res.status(200).json({
      status: 'success',
      data: {
        overview: {
          totalListings,
          activeListings,
          pendingListings,
          totalBookings,
          activeBookings,
          totalViews,
          totalFavorites,
          averageRating: averageRating.toFixed(1),
          unreadMessages
        },
        revenue: {
          ...revenue,
          monthlyTrend: monthlyRevenue
        },
        listings: myListings, // ✅ FIX: Return all listings instead of limiting to 10
        upcomingBookings,
        recentReviews,
        calendarBookings,
        recentMessages,
        performanceChart: {
          views: myListings.map(l => ({
            title: l.title,
            views: l.stats?.views || 0,
            bookings: l.stats?.bookings || 0
          }))
        }
      }
    });
  } catch (error) {
    console.error('Host dashboard error:', error);
    return next(new AppError('Error fetching host dashboard data', 500));
  }
});

// Get Guest Dashboard Data
const getGuestDashboard = catchAsync(async (req, res, next) => {
  try {
    const guestId = req.user.id;
    const today = startOfDay(new Date());

    // Guest's bookings
    const myBookings = await Booking.find({ guest: guestId })
      .sort('-createdAt')
      .populate('listing', 'title category subcategory images address pricing host')
      .populate('host', 'firstName lastName avatar phone email');

    const totalBookings = myBookings.length;
    const upcomingBookings = myBookings.filter(b =>
      b.status === 'confirmed' && isAfter(new Date(b.checkIn), today)
    );
    const activeBookings = myBookings.filter(b => b.status === 'active');
    const completedBookings = myBookings.filter(b => b.status === 'completed');

    // Wishlist/Saved listings
    const user = await User.findById(guestId)
      .populate({
        path: 'savedListings',
        select: 'title category subcategory images pricing address stats host',
        populate: {
          path: 'host',
          select: 'firstName lastName avatar'
        }
      });

    const savedListings = user.savedListings || [];

    // Reviews written by guest
    const myReviews = await Review.find({ reviewer: guestId })
      .sort('-createdAt')
      .populate('listing', 'title category images');

    // Spending statistics - ✅ Fixed
    const spendingData = await Booking.aggregate([
      {
        $match: {
          guest: guestId,
          status: { $in: ['paid', 'active', 'completed'] },
          'payment.status': 'paid' // ✅ Only count paid bookings
        }
      },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: '$pricing.totalAmount' }, // ✅ Fixed
          totalBookings: { $sum: 1 },
          averageBookingValue: { $avg: '$pricing.totalAmount' } // ✅ Fixed
        }
      }
    ]);

    const spending = spendingData[0] || {
      totalSpent: 0,
      totalBookings: 0,
      averageBookingValue: 0
    };

    // Monthly spending trend - ✅ Fixed
    const monthlySpending = await Booking.aggregate([
      {
        $match: {
          guest: guestId,
          status: { $in: ['paid', 'active', 'completed'] },
          'payment.status': 'paid', // ✅ Only paid bookings
          createdAt: { $gte: subMonths(new Date(), 6) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          spent: { $sum: '$pricing.totalAmount' }, // ✅ Fixed
          bookings: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Travel history (cities visited)
    const citiesVisited = await Booking.aggregate([
      {
        $match: {
          guest: guestId,
          status: 'completed'
        }
      },
      {
        $lookup: {
          from: 'listings',
          localField: 'listing',
          foreignField: '_id',
          as: 'listingData'
        }
      },
      { $unwind: '$listingData' },
      {
        $group: {
          _id: '$listingData.address.city',
          count: { $sum: 1 },
          lastVisit: { $max: '$checkOut' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Messages - get conversations
    const conversations = await Conversation.find({
      'participants.user': guestId,
      status: 'active'
    })
      .sort('-lastMessage.sentAt')
      .limit(5)
      .populate('participants.user', 'firstName lastName avatar')
      .populate('listing', 'title');

    // Count unread messages
    let unreadMessages = 0;
    for (const conv of conversations) {
      const count = await conv.getUnreadCount(guestId);
      unreadMessages += count;
    }

    // Format recent messages
    const recentMessages = conversations.map(conv => {
      // Find the other participant (not the current user)
      const otherParticipant = conv.participants.find(
        p => p.user._id.toString() !== guestId.toString()
      );

      return {
        _id: conv._id,
        sender: otherParticipant?.user || conv.participants[0].user,
        content: conv.lastMessage.content,
        createdAt: conv.lastMessage.sentAt
      };
    });

    // Recommended listings (based on previous bookings)
    let recommendedListings = [];
    if (myBookings.length > 0) {
      const bookedCategories = [...new Set(myBookings.map(b => b.listing?.category))];
      const bookedCities = [...new Set(myBookings.map(b => b.listing?.address?.city))];

      recommendedListings = await Listing.find({
        status: 'active',
        _id: { $nin: myBookings.map(b => b.listing?._id) },
        $or: [
          { category: { $in: bookedCategories } },
          { 'address.city': { $in: bookedCities } }
        ]
      })
        .limit(6)
        .select('title category subcategory images pricing address stats')
        .populate('host', 'firstName lastName avatar');
    }

    res.status(200).json({
      status: 'success',
      data: {
        overview: {
          totalBookings,
          upcomingBookings: upcomingBookings.length,
          activeBookings: activeBookings.length,
          completedBookings: completedBookings.length,
          savedListings: savedListings.length,
          totalReviews: myReviews.length,
          unreadMessages,
          citiesVisited: citiesVisited.length
        },
        spending: {
          ...spending,
          monthlyTrend: monthlySpending
        },
        bookings: {
          upcoming: upcomingBookings.slice(0, 5),
          recent: myBookings.slice(0, 5),
          all: myBookings
        },
        savedListings: savedListings.slice(0, 6),
        reviews: myReviews.slice(0, 5),
        travelHistory: citiesVisited,
        recentMessages,
        recommendedListings
      }
    });
  } catch (error) {
    console.error('Guest dashboard error:', error);
    return next(new AppError('Error fetching guest dashboard data', 500));
  }
});

// Get Quick Stats (for all roles)
const getQuickStats = catchAsync(async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    let stats = {};

    if (userRole === 'admin') {
      stats = {
        totalUsers: await User.countDocuments(),
        totalListings: await Listing.countDocuments(),
        totalBookings: await Booking.countDocuments(),
        pendingApprovals: await Listing.countDocuments({ status: 'pending' })
      };
    } else if (userRole === 'host') {
      const myListings = await Listing.find({ host: userId });
      const listingIds = myListings.map(l => l._id);

      // Count unread messages
      const conversations = await Conversation.find({
        'participants.user': userId
      });

      let unreadMessages = 0;
      for (const conv of conversations) {
        const count = await conv.getUnreadCount(userId);
        unreadMessages += count;
      }

      stats = {
        totalListings: myListings.length,
        activeListings: myListings.filter(l => l.status === 'active').length,
        totalBookings: await Booking.countDocuments({ listing: { $in: listingIds } }),
        unreadMessages
      };
    } else {
      const user = await User.findById(userId);

      // Count unread messages for guest
      const conversations = await Conversation.find({
        'participants.user': userId
      });

      let unreadMessages = 0;
      for (const conv of conversations) {
        const count = await conv.getUnreadCount(userId);
        unreadMessages += count;
      }

      stats = {
        totalBookings: await Booking.countDocuments({ guest: userId }),
        upcomingTrips: await Booking.countDocuments({
          guest: userId,
          status: 'confirmed',
          checkIn: { $gte: new Date() }
        }),
        savedListings: user.savedListings?.length || 0,
        unreadMessages
      };
    }

    res.status(200).json({
      status: 'success',
      data: stats
    });
  } catch (error) {
    console.error('Quick stats error:', error);
    return next(new AppError('Error fetching quick stats', 500));
  }
});

module.exports = {
  getAdminDashboard,
  getHostDashboard,
  getGuestDashboard,
  getQuickStats
};