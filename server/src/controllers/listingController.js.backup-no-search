const { validationResult } = require('express-validator');
const Listing = require('../models/Listing');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const {
  sendListingApprovedEmail,
  sendListingRejectedEmail,
  sendListingDeletedEmail
} = require('../utils/emailService');

// @desc    Get all listings with filters and pagination
// @route   GET /api/listings
// @access  Public
const getListings = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      subcategory,
      location,
      minPrice,
      maxPrice,
      startDate,
      endDate,
      guests,
      bedrooms,
      bathrooms,
      amenities,
      sort = '-createdAt',
      currency = 'DZD',
      // Enhanced search parameters
      lat,
      lng,
      radius = 50, // km
      instantBook,
      superhost,
      priceRange,
      rating,
      propertyTypes,
      vehicleTypes,
      features,
      search, // general search term
      excludeIds,
      includeInactive = false
    } = req.query;

    // Build query
    let query = {};

    // Status filter - allow inactive listings if specifically requested
    if (includeInactive === 'true') {
      query.status = { $in: ['active', 'inactive'] };
    } else {
      query.status = 'active';
    }

    // Exclude specific IDs if provided
    if (excludeIds) {
      const idsToExclude = Array.isArray(excludeIds) ? excludeIds : excludeIds.split(',');
      query._id = { $nin: idsToExclude };
    }

    // Category filter with enhanced support
    if (category) {
      if (Array.isArray(category)) {
        query.category = { $in: category };
      } else {
        query.category = category;
      }
    }

    // Subcategory filter with multiple support
    if (subcategory) {
      if (Array.isArray(subcategory)) {
        query.subcategory = { $in: subcategory };
      } else {
        query.subcategory = subcategory;
      }
    }

    // Property types filter (for stays)
    if (propertyTypes && category === 'stay') {
      const types = Array.isArray(propertyTypes) ? propertyTypes : propertyTypes.split(',');
      query['stayDetails.stayType'] = { $in: types };
    }

    // Vehicle types filter (for vehicles)
    if (vehicleTypes && category === 'vehicle') {
      const types = Array.isArray(vehicleTypes) ? vehicleTypes : vehicleTypes.split(',');
      query['vehicleDetails.vehicleType'] = { $in: types };
    }

    // Enhanced price filtering
    if (minPrice || maxPrice || priceRange) {
      query['pricing.basePrice'] = {};

      if (priceRange) {
        // Handle price range array [min, max]
        const range = Array.isArray(priceRange) ? priceRange : priceRange.split(',').map(Number);
        if (range.length === 2) {
          query['pricing.basePrice'].$gte = range[0];
          query['pricing.basePrice'].$lte = range[1];
        }
      } else {
        if (minPrice) query['pricing.basePrice'].$gte = parseFloat(minPrice);
        if (maxPrice) query['pricing.basePrice'].$lte = parseFloat(maxPrice);
      }
    }

    // Rating filter
    if (rating) {
      query['stats.averageRating'] = { $gte: parseFloat(rating) };
    }

    // Instant book filter
    if (instantBook === 'true') {
      query['availability.instantBook'] = true;
    }

    // Superhost filter
    if (superhost === 'true') {
      // We'll add this in the populate stage since it's in the host document
      // For now, we'll handle it after the query
    }

    // Stay-specific filters (for accommodation properties)
    if (bedrooms && bedrooms !== 'any' && !isNaN(parseInt(bedrooms))) {
      query['stayDetails.bedrooms'] = { $gte: parseInt(bedrooms) };
    }

    if (bathrooms && bathrooms !== 'any' && !isNaN(parseInt(bathrooms))) {
      query['stayDetails.bathrooms'] = { $gte: parseInt(bathrooms) };
    }

    // Enhanced amenities filtering (for stays)
    if (amenities && category === 'stay') {
      const amenitiesArray = Array.isArray(amenities) ? amenities : amenities.split(',');
      query['stayDetails.amenities'] = { $all: amenitiesArray }; // Changed from $in to $all for better matching
    }

    // Enhanced features filtering (for vehicles)
    if (features && category === 'vehicle') {
      const featuresArray = Array.isArray(features) ? features : features.split(',');
      query['vehicleDetails.features'] = { $all: featuresArray };
    }

    // Enhanced location-based search
    if (location || (lat && lng)) {
      if (lat && lng && radius) {
        // Geospatial search with radius
        const radiusInMeters = parseFloat(radius) * 1000;
        query.location = {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(lng), parseFloat(lat)]
            },
            $maxDistance: radiusInMeters
          }
        };
      } else if (location) {
        // Text-based location search
        const locationQuery = {
          $or: [
            { 'address.city': { $regex: location, $options: 'i' } },
            { 'address.state': { $regex: location, $options: 'i' } },
            { 'address.country': { $regex: location, $options: 'i' } },
            { title: { $regex: location, $options: 'i' } },
            { description: { $regex: location, $options: 'i' } }
          ]
        };
        query = { ...query, ...locationQuery };
      }
    }

    // General search functionality
    if (search) {
      const searchQuery = {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { 'address.city': { $regex: search, $options: 'i' } },
          { 'address.state': { $regex: search, $options: 'i' } },
          { subcategory: { $regex: search, $options: 'i' } },
          { 'stayDetails.stayType': { $regex: search, $options: 'i' } },
          { 'vehicleDetails.make': { $regex: search, $options: 'i' } },
          { 'vehicleDetails.model': { $regex: search, $options: 'i' } }
        ]
      };
      query = { ...query, ...searchQuery };
    }

    // Availability check
    if (startDate && endDate) {
      const unavailableListings = await Booking.distinct('listing', {
        status: { $in: ['confirmed', 'paid', 'active'] },
        $or: [
          {
            startDate: { $lte: new Date(startDate) },
            endDate: { $gt: new Date(startDate) }
          },
          {
            startDate: { $lt: new Date(endDate) },
            endDate: { $gte: new Date(endDate) }
          },
          {
            startDate: { $gte: new Date(startDate) },
            endDate: { $lte: new Date(endDate) }
          }
        ]
      });

      query._id = { $nin: unavailableListings };
    }

    // Guest capacity filter (for stays)
    if (guests && category === 'stay') {
      // Filter based on maximum guests that can be accommodated
      // Calculate based on bedrooms (assuming 2 guests per bedroom + living room capacity)
      const minBedrooms = Math.ceil(guests / 2);
      query['stayDetails.bedrooms'] = { $gte: minBedrooms };
    }

    // Enhanced sorting options
    let sortOptions = {};
    switch (sort) {
      case 'price_asc':
        sortOptions = { 'pricing.basePrice': 1 };
        break;
      case 'price_desc':
        sortOptions = { 'pricing.basePrice': -1 };
        break;
      case 'rating':
        sortOptions = { 'stats.averageRating': -1, 'stats.reviewCount': -1 };
        break;
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      case 'popular':
        sortOptions = { 'stats.views': -1, 'stats.bookings': -1 };
        break;
      case 'distance':
        // Distance sorting is handled by geospatial query
        sortOptions = lat && lng ? {} : { createdAt: -1 };
        break;
      case 'recommended':
      default:
        // Smart recommendation based on multiple factors
        sortOptions = {
          featured: -1,
          'stats.averageRating': -1,
          'stats.bookings': -1,
          'stats.views': -1,
          createdAt: -1
        };
        break;
    }

    // Execute query with enhanced options
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: sortOptions,
      populate: [
        {
          path: 'host',
          select: 'firstName lastName avatar stats.averageRating stats.totalReviews hostInfo.superhost',
          match: superhost === 'true' ? { 'hostInfo.superhost': true } : {}
        }
      ],
      lean: false, // Keep as false to get virtuals
      select: '-adminNotes -rejectionReason' // Exclude sensitive fields
    };

    const listings = await Listing.paginate(query, options);

    // Filter out listings where host is null (superhost filter)
    let filteredListings = listings.docs;
    if (superhost === 'true') {
      filteredListings = listings.docs.filter(listing => listing.host && listing.host.hostInfo?.superhost);
    }

    // Enhanced data processing
    const processedListings = filteredListings.map(listing => {
      const listingObj = listing.toObject();

      // Add currency conversion if needed
      if (currency !== 'DZD') {
        if (listing.pricing.currency === 'DZD' && currency === 'EUR') {
          listingObj.pricing.convertedPrice = listing.priceInEUR;
        } else if (listing.pricing.currency === 'EUR' && currency === 'DZD') {
          listingObj.pricing.convertedPrice = listing.priceInDZD;
        }
      }

      // Add computed fields for better frontend integration
      listingObj.displayPrice = listingObj.pricing.convertedPrice || listingObj.pricing.basePrice;
      listingObj.priceRange = {
        min: listingObj.pricing.basePrice,
        max: listingObj.pricing.basePrice + (listingObj.pricing.cleaningFee || 0) + (listingObj.pricing.serviceFee || 0)
      };

      // Add availability status
      listingObj.isAvailable = listingObj.status === 'active' && !listingObj.blockedDates?.some(block => {
        const now = new Date();
        return new Date(block.startDate) <= now && now <= new Date(block.endDate);
      });

      // Distance from search point (if coordinates provided)
      if (lat && lng && listingObj.location?.coordinates) {
        const [listingLng, listingLat] = listingObj.location.coordinates;
        const distance = calculateDistance(lat, lng, listingLat, listingLng);
        listingObj.distanceFromSearch = Math.round(distance * 100) / 100; // Round to 2 decimals
      }

      return listingObj;
    });

    // Get aggregation stats for better search insights
    const aggregateStats = await Listing.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          avgPrice: { $avg: '$pricing.basePrice' },
          minPrice: { $min: '$pricing.basePrice' },
          maxPrice: { $max: '$pricing.basePrice' },
          avgRating: { $avg: '$stats.averageRating' },
          totalListings: { $sum: 1 }
        }
      }
    ]);

    const stats = aggregateStats[0] || {
      avgPrice: 0,
      minPrice: 0,
      maxPrice: 0,
      avgRating: 0,
      totalListings: 0
    };

    res.status(200).json({
      status: 'success',
      results: processedListings.length,
      pagination: {
        page: listings.page,
        pages: listings.totalPages,
        total: listings.totalDocs,
        limit: listings.limit,
        hasNext: listings.hasNextPage,
        hasPrev: listings.hasPrevPage
      },
      filters: {
        applied: {
          category,
          location,
          priceRange: priceRange || [minPrice, maxPrice].filter(Boolean),
          amenities: amenities ? (Array.isArray(amenities) ? amenities : amenities.split(',')) : null,
          instantBook: instantBook === 'true',
          superhost: superhost === 'true',
          rating: rating ? parseFloat(rating) : null
        },
        stats
      },
      data: {
        listings: processedListings
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single listing
// @route   GET /api/listings/:id
// @access  Public
const getListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate([
        {
          path: 'host',
          select: 'firstName lastName avatar bio stats hostInfo'
        }
      ]);

    if (!listing) {
      return res.status(404).json({
        status: 'error',
        message: 'Listing not found'
      });
    }

    // Increment view count
    listing.stats.views += 1;
    await listing.save({ validateBeforeSave: false });

    res.status(200).json({
      status: 'success',
      data: {
        listing
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new listing
// @route   POST /api/listings
// @access  Private (Host/Admin)
const createListing = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors: errors.array()
      });
    }

    // Add user as host
    req.body.host = req.user.id;

    const listing = await Listing.create(req.body);

    // Update user to host if they're not already
    if (req.user.role === 'guest') {
      await User.findByIdAndUpdate(req.user.id, {
        role: 'host',
        'hostInfo.isHost': true,
        'hostInfo.hostSince': new Date()
      });
    }

    // Create notification for host
    try {
      await Notification.createNotification({
        recipient: req.user.id,
        type: 'listing_created',
        title: 'Listing Created Successfully! 🎉',
        message: `Your ${listing.category === 'stay' ? 'property' : 'vehicle'} "${listing.title}" has been created successfully. It will be reviewed by our team before going live.`,
        data: {
          listingId: listing._id,
          listingTitle: listing.title,
          listingCategory: listing.category,
          status: listing.status
        },
        link: `/dashboard/host/listings/${listing._id}`,
        priority: 'high'
      });
    } catch (notificationError) {
      console.error('Error creating listing notification:', notificationError);
    }

    res.status(201).json({
      status: 'success',
      data: {
        listing
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update listing
// @route   PUT /api/listings/:id
// @access  Private (Host/Admin)
const updateListing = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors: errors.array()
      });
    }

    let listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        status: 'error',
        message: 'Listing not found'
      });
    }

    // Check ownership
    if (listing.host.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to update this listing'
      });
    }

    // Store old status to detect changes
    const oldStatus = listing.status;
    const isAdminStatusChange = req.user.role === 'admin' && req.body.status && req.body.status !== oldStatus;

    listing = await Listing.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    await listing.populate('host', 'firstName lastName email');

    // Handle admin status changes (approve/reject)
    if (isAdminStatusChange) {
      try {
        const host = await User.findById(listing.host._id);

        if (listing.status === 'active' && oldStatus === 'pending') {
          // Listing approved
          await Notification.createNotification({
            recipient: listing.host._id,
            type: 'listing_approved',
            title: 'Listing Approved! 🎉',
            message: `Your ${listing.category === 'stay' ? 'property' : 'vehicle'} "${listing.title}" has been approved and is now live on Baytup!`,
            data: {
              listingId: listing._id,
              listingTitle: listing.title,
              listingCategory: listing.category,
              approvedAt: new Date()
            },
            link: `/host/listings/${listing._id}`,
            priority: 'high'
          });

          await sendListingApprovedEmail(host, listing);

        } else if (listing.status === 'rejected') {
          // Listing rejected
          await Notification.createNotification({
            recipient: listing.host._id,
            type: 'listing_rejected',
            title: 'Listing Not Approved',
            message: `Your listing "${listing.title}" was not approved. ${req.body.rejectionReason || 'Please review our listing guidelines and resubmit.'}`,
            data: {
              listingId: listing._id,
              listingTitle: listing.title,
              rejectionReason: req.body.rejectionReason || 'No reason provided',
              rejectedAt: new Date()
            },
            link: `/host/listings/${listing._id}/edit`,
            priority: 'high'
          });

          await sendListingRejectedEmail(host, listing, req.body.rejectionReason);
        }
      } catch (notificationError) {
        console.error('Error sending listing status change notifications:', notificationError);
      }
    } else {
      // Regular update notification (non-status change)
      try {
        await Notification.createNotification({
          recipient: listing.host._id,
          type: 'listing_updated',
          title: 'Listing Updated! ✏️',
          message: `Your ${listing.category === 'stay' ? 'property' : 'vehicle'} "${listing.title}" has been updated successfully.`,
          data: {
            listingId: listing._id,
            listingTitle: listing.title,
            listingCategory: listing.category,
            status: listing.status
          },
          link: `/dashboard/host/listings/${listing._id}`,
          priority: 'normal'
        });
      } catch (notificationError) {
        console.error('Error creating listing update notification:', notificationError);
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        listing
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete listing
// @route   DELETE /api/listings/:id
// @access  Private (Host/Admin)
const deleteListing = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        status: 'error',
        message: 'Listing not found'
      });
    }

    // Check ownership
    if (listing.host.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to delete this listing'
      });
    }

    // Check for active bookings
    const activeBookings = await Booking.find({
      listing: req.params.id,
      status: { $in: ['confirmed', 'paid', 'active'] },
      endDate: { $gte: new Date() }
    });

    if (activeBookings.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot delete listing with active bookings'
      });
    }

    // Get host info before deletion
    await listing.populate('host', 'firstName lastName email');
    const host = await User.findById(listing.host._id);
    const listingData = { ...listing.toObject() };
    const isAdminDeletion = req.user.role === 'admin' && req.user.id !== listing.host._id.toString();

    await listing.deleteOne();

    // Send notification and email
    try {
      await Notification.createNotification({
        recipient: listingData.host._id,
        type: 'listing_deleted',
        title: `Listing ${isAdminDeletion ? 'Removed' : 'Deleted'}`,
        message: `Your listing "${listingData.title}" has been ${isAdminDeletion ? 'removed by admin' : 'deleted successfully'}.`,
        data: {
          listingTitle: listingData.title,
          listingCategory: listingData.category,
          deletedBy: isAdminDeletion ? 'admin' : 'host',
          deletedAt: new Date()
        },
        link: '/dashboard/host/listings',
        priority: isAdminDeletion ? 'urgent' : 'normal'
      });

      await sendListingDeletedEmail(host, listingData, isAdminDeletion ? 'admin' : 'host', req.body.deletionReason);
    } catch (notificationError) {
      console.error('Error sending listing deletion notification:', notificationError);
    }

    res.status(200).json({
      status: 'success',
      message: 'Listing deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get listings by host
// @route   GET /api/listings/host/:hostId
// @access  Public
const getListingsByHost = async (req, res, next) => {
  try {
    const { page = 1, limit = 12 } = req.query;

    const query = {
      host: req.params.hostId,
      status: 'active'
    };

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: '-createdAt'
    };

    const listings = await Listing.paginate(query, options);

    res.status(200).json({
      status: 'success',
      results: listings.docs.length,
      pagination: {
        page: listings.page,
        pages: listings.totalPages,
        total: listings.totalDocs
      },
      data: {
        listings: listings.docs
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my listings
// @route   GET /api/listings/my
// @access  Private (Host)
const getMyListings = async (req, res, next) => {
  try {
    const { page = 1, limit = 12, status, search } = req.query;

    let query = { host: req.user.id };

    if (status) {
      query.status = status;
    }

    // Add search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
        { 'address.street': { $regex: search, $options: 'i' } }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: '-createdAt'
    };

    const listings = await Listing.paginate(query, options);

    res.status(200).json({
      status: 'success',
      results: listings.docs.length,
      pagination: {
        page: listings.page,
        pages: listings.totalPages,
        total: listings.totalDocs
      },
      data: {
        listings: listings.docs
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle favorite listing
// @route   POST /api/listings/:id/favorite
// @access  Private
const toggleFavorite = async (req, res, next) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        status: 'error',
        message: 'Listing not found'
      });
    }

    const user = await User.findById(req.user.id);
    const favorites = user.favorites || [];
    const isFavorited = favorites.includes(req.params.id);

    if (isFavorited) {
      // Remove from favorites
      user.favorites = favorites.filter(id => id.toString() !== req.params.id);
      listing.stats.favorites = Math.max(0, listing.stats.favorites - 1);
    } else {
      // Add to favorites
      user.favorites = [...favorites, req.params.id];
      listing.stats.favorites += 1;
    }

    await Promise.all([
      user.save({ validateBeforeSave: false }),
      listing.save({ validateBeforeSave: false })
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        isFavorited: !isFavorited,
        favoritesCount: listing.stats.favorites
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get featured listings
// @route   GET /api/listings/featured
// @access  Public
const getFeaturedListings = async (req, res, next) => {
  try {
    const { limit = 8 } = req.query;

    const listings = await Listing.find({
      featured: true,
      status: 'active',
      featuredUntil: { $gte: new Date() }
    })
      .populate({
        path: 'host',
        select: 'firstName lastName avatar stats.averageRating'
      })
      .sort('-createdAt')
      .limit(parseInt(limit));

    res.status(200).json({
      status: 'success',
      results: listings.length,
      data: {
        listings
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Advanced search with suggestions and faceted search
// @route   POST /api/listings/search
// @access  Public
const advancedSearch = async (req, res, next) => {
  try {
    const {
      query: searchQuery,
      filters = {},
      facets = [],
      suggestions = false,
      aggregations = false,
      similar = null // listing ID for similar listings
    } = req.body;

    let pipeline = [];

    // Match stage
    let matchQuery = { status: 'active' };

    // Apply filters from the request body
    if (filters.category) matchQuery.category = filters.category;
    if (filters.location) {
      matchQuery.$or = [
        { 'address.city': { $regex: filters.location, $options: 'i' } },
        { 'address.state': { $regex: filters.location, $options: 'i' } }
      ];
    }
    if (filters.priceRange) {
      matchQuery['pricing.basePrice'] = {
        $gte: filters.priceRange[0],
        $lte: filters.priceRange[1]
      };
    }

    // Text search
    if (searchQuery) {
      matchQuery.$text = { $search: searchQuery };
      pipeline.push({ $addFields: { score: { $meta: 'textScore' } } });
    }

    pipeline.push({ $match: matchQuery });

    // Similar listings based on category, price range, and location
    if (similar) {
      const similarListing = await Listing.findById(similar);
      if (similarListing) {
        const priceRange = similarListing.pricing.basePrice;
        matchQuery = {
          ...matchQuery,
          _id: { $ne: similar },
          category: similarListing.category,
          'pricing.basePrice': {
            $gte: priceRange * 0.7,
            $lte: priceRange * 1.3
          }
        };
      }
    }

    // Add population and projection
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'host',
        foreignField: '_id',
        as: 'host'
      }
    });

    pipeline.push({ $unwind: '$host' });
    pipeline.push({ $limit: parseInt(filters.limit) || 20 });

    const results = await Listing.aggregate(pipeline);

    // Generate facets if requested
    let facetData = {};
    if (facets.length > 0) {
      const facetPipeline = [{ $match: matchQuery }];

      if (facets.includes('category')) {
        facetData.categories = await Listing.aggregate([
          ...facetPipeline,
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]);
      }

      if (facets.includes('priceRanges')) {
        facetData.priceRanges = await Listing.aggregate([
          ...facetPipeline,
          {
            $bucket: {
              groupBy: '$pricing.basePrice',
              boundaries: [0, 5000, 10000, 20000, 50000, 100000, Infinity],
              default: 'Other',
              output: { count: { $sum: 1 } }
            }
          }
        ]);
      }

      if (facets.includes('locations')) {
        facetData.locations = await Listing.aggregate([
          ...facetPipeline,
          { $group: { _id: '$address.city', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]);
      }
    }

    // Generate search suggestions if requested
    let suggestions_data = [];
    if (suggestions && searchQuery) {
      suggestions_data = await Listing.aggregate([
        {
          $match: {
            $or: [
              { title: { $regex: searchQuery, $options: 'i' } },
              { 'address.city': { $regex: searchQuery, $options: 'i' } },
              { subcategory: { $regex: searchQuery, $options: 'i' } }
            ]
          }
        },
        {
          $group: {
            _id: null,
            titles: { $addToSet: '$title' },
            cities: { $addToSet: '$address.city' },
            subcategories: { $addToSet: '$subcategory' }
          }
        }
      ]);
    }

    res.status(200).json({
      status: 'success',
      results: results.length,
      data: {
        listings: results
      },
      facets: facetData,
      suggestions: suggestions_data[0] || {},
      meta: {
        searchQuery,
        filters,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get search suggestions
// @route   GET /api/listings/suggestions
// @access  Public
const getSearchSuggestions = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.status(200).json({
        status: 'success',
        data: { suggestions: [] }
      });
    }

    const suggestions = await Listing.aggregate([
      {
        $match: {
          status: 'active',
          $or: [
            { title: { $regex: q, $options: 'i' } },
            { 'address.city': { $regex: q, $options: 'i' } },
            { 'address.state': { $regex: q, $options: 'i' } },
            { subcategory: { $regex: q, $options: 'i' } }
          ]
        }
      },
      {
        $group: {
          _id: null,
          cities: { $addToSet: '$address.city' },
          subcategories: { $addToSet: '$subcategory' },
          titles: { $addToSet: { $substr: ['$title', 0, 50] } }
        }
      }
    ]);

    const result = suggestions[0] || { cities: [], subcategories: [], titles: [] };
    const allSuggestions = [
      ...result.cities.map(city => ({ type: 'location', value: city, display: `📍 ${city}` })),
      ...result.subcategories.map(sub => ({ type: 'category', value: sub, display: `🏷️ ${sub}` })),
      ...result.titles.slice(0, 3).map(title => ({ type: 'listing', value: title, display: `🏠 ${title}` }))
    ].slice(0, 8);

    res.status(200).json({
      status: 'success',
      data: { suggestions: allSuggestions }
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to calculate distance between two coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  return distance;
};

// @desc    Get listing filters and aggregated data
// @route   GET /api/listings/filters
// @access  Public
const getFilters = async (req, res, next) => {
  try {
    const { category } = req.query;

    // Build base query
    let query = { status: 'active' };
    if (category) {
      // Handle both 'stay'/'stays' and 'vehicle'/'vehicles'
      if (category === 'stays' || category === 'stay') {
        query.category = 'stay';
      } else if (category === 'vehicles' || category === 'vehicle') {
        query.category = 'vehicle';
      }
    }

    // Get aggregated filter data
    const filtersData = await Listing.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          minPrice: { $min: '$pricing.basePrice' },
          maxPrice: { $max: '$pricing.basePrice' },
          avgPrice: { $avg: '$pricing.basePrice' },
          avgRating: { $avg: '$stats.averageRating' },
          totalListings: { $sum: 1 },
          cities: { $addToSet: '$address.city' },
          subcategories: { $addToSet: '$subcategory' },
          amenities: { $addToSet: '$stayDetails.amenities' },
          features: { $addToSet: '$vehicleDetails.features' }
        }
      }
    ]);

    // Get property types for stays
    let propertyTypes = [];
    if (!category || category === 'stay' || category === 'stays') {
      const stayTypes = await Listing.distinct('stayDetails.stayType', {
        ...query,
        category: 'stay'
      });
      propertyTypes = stayTypes.filter(type => type);
    }

    // Get vehicle types for vehicles
    let vehicleTypes = [];
    if (!category || category === 'vehicle' || category === 'vehicles') {
      const vTypes = await Listing.distinct('vehicleDetails.vehicleType', {
        ...query,
        category: 'vehicle'
      });
      vehicleTypes = vTypes.filter(type => type);
    }

    const data = filtersData.length > 0 ? filtersData[0] : {
      _id: null,
      minPrice: 0,
      maxPrice: 0,
      avgPrice: 0,
      avgRating: 0,
      totalListings: 0,
      cities: [],
      subcategories: [],
      amenities: [],
      features: []
    };

    // Flatten nested arrays
    const flattenedAmenities = data.amenities.flat().filter(Boolean);
    const flattenedFeatures = data.features.flat().filter(Boolean);

    res.status(200).json({
      status: 'success',
      data: {
        priceRange: {
          min: data.minPrice || 0,
          max: data.maxPrice || 100000,
          avg: Math.round(data.avgPrice || 0)
        },
        rating: {
          avg: parseFloat((data.avgRating || 0).toFixed(1))
        },
        locations: data.cities.sort(),
        propertyTypes: propertyTypes.sort(),
        vehicleTypes: vehicleTypes.sort(),
        amenities: [...new Set(flattenedAmenities)].sort(),
        features: [...new Set(flattenedFeatures)].sort(),
        subcategories: data.subcategories.sort(),
        totalListings: data.totalListings,
        category: query.category || 'all'
      }
    });
  } catch (error) {
    console.error('Get filters error:', error);
    next(error);
  }
};

module.exports = {
  getListings,
  getListing,
  createListing,
  updateListing,
  deleteListing,
  getListingsByHost,
  getMyListings,
  toggleFavorite,
  getFeaturedListings,
  advancedSearch,
  getSearchSuggestions,
  getFilters
};