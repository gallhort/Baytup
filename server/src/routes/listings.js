const express = require('express');
const Listing = require('../models/Listing');
const {
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
} = require('../controllers/listingController');
const { protect, hostOrAdmin, optionalAuth } = require('../middleware/auth');
const {
  createListingValidation,
  updateListingValidation,
  searchValidation,
  mongoIdValidation,
  validate
} = require('../utils/validation');
const { uploadListingImage, handleUploadError, validateFileContent } = require('../middleware/upload');

const router = express.Router();

// Public routes (no authentication required)
router.get('/', searchValidation, validate, optionalAuth, getListings);
router.get('/filters', getFilters);
router.get('/featured', getFeaturedListings);
router.get('/suggestions', getSearchSuggestions);
router.post('/search', advancedSearch);
router.get('/host/:hostId', mongoIdValidation, validate, getListingsByHost);

// Get single listing - handle deleted for admin
router.get('/:id', mongoIdValidation, validate, optionalAuth, async (req, res, next) => {
  try {
    const options = {};
    if (req.user && req.user.role === 'admin') {
      options.includeDeleted = true;
    }

    const listing = await Listing.findById(req.params.id)
      .setOptions(options)
      .populate('host', 'firstName lastName avatar email phone');

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    if (listing.isDeleted && (!req.user || req.user.role !== 'admin')) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    if (listing.isDeleted) {
      return res.json({
        success: true,
        data: { 
          listing,
          warning: 'This listing has been deleted'
        }
      });
    }

    res.json({
      success: true,
      data: { listing }
    });
  } catch (error) {
    next(error);
  }
});

// Protected routes - Must come AFTER public routes
router.use(protect); // All routes below this middleware are protected

// Image upload route - must come before /:id route
router.post('/upload-images', uploadListingImage.array('images', 10), handleUploadError, validateFileContent, (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No images uploaded'
      });
    }

    const uploadedImages = req.files.map(file => ({
      url: `/uploads/listings/${file.filename}`,
      caption: '',
      isPrimary: false
    }));

    res.status(200).json({
      status: 'success',
      data: {
        images: uploadedImages
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// My listings - must come before /:id route
router.get('/my/listings', getMyListings);

// Create listing
router.post('/', createListingValidation, validate, hostOrAdmin, createListing);

// Specific listing operations by ID - these are protected routes
router.put('/:id', mongoIdValidation, updateListingValidation, validate, updateListing);

// Soft delete instead of hard delete
router.delete('/:id', mongoIdValidation, validate, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).setOptions({ includeDeleted: true });
    
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    if (listing.host.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this listing'
      });
    }

    // ✅ CHECK: Open disputes?
    const Dispute = require('../models/Dispute');
    const Booking = require('../models/Booking');
    
    const bookings = await Booking.find({ listing: listing._id }).select('_id');
    const bookingIds = bookings.map(b => b._id);
    
    const openDisputes = await Dispute.countDocuments({
      booking: { $in: bookingIds },
      status: { $in: ['open', 'pending'] }
    });

    if (openDisputes > 0) {
      return res.status(400).json({
        success: false,
        message: `Impossible de supprimer: ${openDisputes} litige(s) en cours sur ce listing`,
        openDisputes
      });
    }

    // ✅ SOFT DELETE
    await listing.softDelete(req.user.id);

    res.json({
      success: true,
      message: 'Listing supprimé avec succès',
      data: { listing }
    });
  } catch (error) {
    console.error('Error deleting listing:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Restore deleted listing
router.post('/:id/restore', mongoIdValidation, validate, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).setOptions({ includeDeleted: true });
    
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    if (!listing.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Listing is not deleted'
      });
    }

    if (listing.host.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to restore this listing'
      });
    }

    await listing.restore();

    res.json({
      success: true,
      message: 'Listing restored successfully',
      data: { listing }
    });
  } catch (error) {
    console.error('Error restoring listing:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.post('/:id/favorite', mongoIdValidation, validate, toggleFavorite);

// Test route - dev only (P1 #31)
if (process.env.NODE_ENV !== 'production') {
  router.get('/test/status', (req, res) => {
    res.json({
      status: 'success',
      message: 'Listings routes working',
      timestamp: new Date().toISOString()
    });
  });
}

// Pause/Activate listing
router.patch('/:id/status', mongoIdValidation, validate, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    
    if (!listing) {
      return res.status(404).json({
        status: 'error',
        message: 'Listing not found'
      });
    }

    // Check if user is the owner or admin
    if (listing.host.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to modify this listing'
      });
    }

    // Toggle between active and paused
    listing.status = listing.status === 'active' ? 'paused' : 'active';
    await listing.save();

    res.status(200).json({
      status: 'success',
      data: {
        listing
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Duplicate listing
router.post('/:id/duplicate', mongoIdValidation, validate, async (req, res) => {
  try {
    const originalListing = await Listing.findById(req.params.id);
    
    if (!originalListing) {
      return res.status(404).json({
        status: 'error',
        message: 'Listing not found'
      });
    }

    // Check if user is the owner or admin
    if (originalListing.host.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Not authorized to duplicate this listing'
      });
    }

    // Create a copy of the listing
    const listingData = originalListing.toObject();
    delete listingData._id;
    delete listingData.createdAt;
    delete listingData.updatedAt;
    delete listingData.__v;
    
    // Modify title to indicate it's a copy
    listingData.title = `${listingData.title} (Copy)`;
    listingData.status = 'draft'; // New copy starts as draft
    listingData.host = req.user.id;

    const newListing = await Listing.create(listingData);

    res.status(201).json({
      status: 'success',
      data: {
        listing: newListing
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;