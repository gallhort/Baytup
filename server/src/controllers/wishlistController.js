const User = require('../models/User');
const Listing = require('../models/Listing');
const Notification = require('../models/Notification');

// @desc    Get user's wishlist with filters and sorting
// @route   GET /api/wishlists
// @access  Private
const getWishlist = async (req, res, next) => {
  try {
    const { category, priceMin, priceMax, sort = '-createdAt' } = req.query;

    const user = await User.findById(req.user.id)
      .populate({
        path: 'savedListings',
        select: 'title description images pricing location address category subcategory host stats status availability createdAt',
        match: {
          status: 'active',
          ...(category && category !== 'all' ? { category } : {})
        },
        populate: {
          path: 'host',
          select: 'firstName lastName avatar hostInfo.superhost'
        },
        options: {
          sort: sort
        }
      })
      .lean();

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    let wishlistItems = user.savedListings || [];

    // Apply price filter
    if (priceMin || priceMax) {
      wishlistItems = wishlistItems.filter(item => {
        const price = item.pricing?.basePrice || 0;
        if (priceMin && price < parseFloat(priceMin)) return false;
        if (priceMax && price > parseFloat(priceMax)) return false;
        return true;
      });
    }

    // Add computed fields
    wishlistItems = wishlistItems.map(item => ({
      ...item,
      isSaved: true,
      primaryImage: item.images?.find(img => img.isPrimary)?.url || item.images?.[0]?.url || '/uploads/listings/default.jpg',
      displayPrice: item.pricing?.basePrice || 0,
      currency: item.pricing?.currency || 'DZD',
      categoryLabel: item.category === 'stay' ? 'Stay' : item.category === 'car' ? 'Car Rental' : item.category
    }));

    res.status(200).json({
      status: 'success',
      count: wishlistItems.length,
      data: wishlistItems
    });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching wishlist',
      error: error.message
    });
  }
};

// @desc    Add listing to wishlist
// @route   POST /api/wishlists/:listingId
// @access  Private
const addToWishlist = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const userId = req.user.id;

    // Check if listing exists and is active
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({
        status: 'error',
        message: 'Listing not found'
      });
    }

    if (listing.status !== 'active') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot save inactive listing'
      });
    }

    // Find user and check if listing is already saved
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Initialize savedListings if it doesn't exist
    if (!user.savedListings) {
      user.savedListings = [];
    }

    // Check if already in wishlist
    if (user.savedListings.includes(listingId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Listing already in wishlist'
      });
    }

    // Add to wishlist
    user.savedListings.push(listingId);
    await user.save();

    // Update listing favorites count
    await Listing.findByIdAndUpdate(listingId, {
      $inc: { 'stats.favorites': 1 }
    });

    // Create notification for user
    try {
      await Notification.createNotification({
        recipient: userId,
        type: 'wishlist_listing_added',
        title: 'Added to Wishlist! ❤️',
        message: `"${listing.title}" has been added to your wishlist.`,
        data: {
          listingId,
          listingTitle: listing.title,
          listingCategory: listing.category
        },
        link: `/dashboard/saved`,
        priority: 'low'
      });
    } catch (notificationError) {
      console.error('Error creating wishlist notification:', notificationError);
    }

    res.status(200).json({
      status: 'success',
      message: 'Listing added to wishlist',
      data: {
        listingId,
        isSaved: true,
        savedCount: user.savedListings.length
      }
    });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error adding to wishlist',
      error: error.message
    });
  }
};

// @desc    Remove listing from wishlist
// @route   DELETE /api/wishlists/:listingId
// @access  Private
const removeFromWishlist = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const userId = req.user.id;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Initialize savedListings if it doesn't exist
    if (!user.savedListings) {
      user.savedListings = [];
    }

    // Check if listing is in wishlist
    const index = user.savedListings.indexOf(listingId);
    if (index === -1) {
      return res.status(400).json({
        status: 'error',
        message: 'Listing not in wishlist'
      });
    }

    // Remove from wishlist
    user.savedListings.splice(index, 1);
    await user.save();

    // Update listing favorites count
    await Listing.findByIdAndUpdate(listingId, {
      $inc: { 'stats.favorites': -1 }
    });

    res.status(200).json({
      status: 'success',
      message: 'Listing removed from wishlist',
      data: {
        listingId,
        isSaved: false,
        savedCount: user.savedListings.length
      }
    });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error removing from wishlist',
      error: error.message
    });
  }
};

// @desc    Toggle listing in wishlist
// @route   PUT /api/wishlists/:listingId/toggle
// @access  Private
const toggleWishlist = async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const userId = req.user.id;

    // Check if listing exists
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({
        status: 'error',
        message: 'Listing not found'
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Initialize savedListings if it doesn't exist
    if (!user.savedListings) {
      user.savedListings = [];
    }

    // Toggle wishlist status
    const index = user.savedListings.indexOf(listingId);
    let action = '';

    if (index === -1) {
      // Add to wishlist
      user.savedListings.push(listingId);
      await Listing.findByIdAndUpdate(listingId, {
        $inc: { 'stats.favorites': 1 }
      });
      action = 'added';
    } else {
      // Remove from wishlist
      user.savedListings.splice(index, 1);
      await Listing.findByIdAndUpdate(listingId, {
        $inc: { 'stats.favorites': -1 }
      });
      action = 'removed';
    }

    await user.save();

    res.status(200).json({
      status: 'success',
      message: `Listing ${action} ${action === 'added' ? 'to' : 'from'} wishlist`,
      data: {
        listingId,
        isSaved: action === 'added',
        savedCount: user.savedListings.length
      }
    });
  } catch (error) {
    console.error('Toggle wishlist error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error toggling wishlist',
      error: error.message
    });
  }
};

// @desc    Check if listings are in wishlist
// @route   POST /api/wishlists/check
// @access  Private
const checkWishlistStatus = async (req, res, next) => {
  try {
    const { listingIds } = req.body;
    const userId = req.user.id;

    if (!listingIds || !Array.isArray(listingIds)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid listing IDs'
      });
    }

    // Find user
    const user = await User.findById(userId).select('savedListings');
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Check each listing
    const wishlistStatus = {};
    const savedListings = user.savedListings || [];

    listingIds.forEach(id => {
      wishlistStatus[id] = savedListings.includes(id);
    });

    res.status(200).json({
      status: 'success',
      data: wishlistStatus
    });
  } catch (error) {
    console.error('Check wishlist status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error checking wishlist status',
      error: error.message
    });
  }
};

// @desc    Clear all saved listings
// @route   DELETE /api/wishlists/clear
// @access  Private
const clearWishlist = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const savedListings = user.savedListings || [];
    const count = savedListings.length;

    // Update favorites count for all saved listings
    if (count > 0) {
      await Listing.updateMany(
        { _id: { $in: savedListings } },
        { $inc: { 'stats.favorites': -1 } }
      );
    }

    // Clear saved listings
    user.savedListings = [];
    await user.save();

    res.status(200).json({
      status: 'success',
      message: `Cleared ${count} saved listings`,
      data: {
        clearedCount: count
      }
    });
  } catch (error) {
    console.error('Clear wishlist error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error clearing wishlist',
      error: error.message
    });
  }
};

// @desc    Get wishlist statistics
// @route   GET /api/wishlists/stats
// @access  Private
const getWishlistStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId)
      .populate({
        path: 'savedListings',
        select: 'category pricing',
        match: { status: 'active' }
      })
      .lean();

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const savedListings = user.savedListings || [];
    const totalSaved = savedListings.length;

    // Calculate statistics
    const stats = {
      totalSaved,
      byCategory: {
        stay: 0,
        car: 0
      },
      totalValue: 0,
      averagePrice: 0
    };

    savedListings.forEach(listing => {
      if (listing.category === 'stay') stats.byCategory.stay++;
      if (listing.category === 'car') stats.byCategory.car++;
      if (listing.pricing?.basePrice) {
        stats.totalValue += listing.pricing.basePrice;
      }
    });

    if (totalSaved > 0) {
      stats.averagePrice = Math.round(stats.totalValue / totalSaved);
    }

    res.status(200).json({
      status: 'success',
      data: stats
    });
  } catch (error) {
    console.error('Get wishlist stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching wishlist stats',
      error: error.message
    });
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  toggleWishlist,
  checkWishlistStatus,
  clearWishlist,
  getWishlistStats
};
