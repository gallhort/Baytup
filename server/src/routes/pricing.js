/**
 * Dynamic Pricing Routes
 * API endpoints for managing and calculating dynamic pricing
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Listing = require('../models/Listing');
const dynamicPricingService = require('../services/dynamicPricingService');

/**
 * @desc    Calculate price for a booking
 * @route   POST /api/pricing/calculate
 * @access  Public
 */
router.post('/calculate', async (req, res) => {
  try {
    const { listingId, startDate, endDate } = req.body;

    if (!listingId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide listingId, startDate, and endDate'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format for startDate or endDate'
      });
    }

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: 'endDate must be after startDate'
      });
    }

    const pricing = await dynamicPricingService.calculateBookingPrice(
      listingId,
      start,
      end
    );

    res.status(200).json({
      success: true,
      data: pricing
    });
  } catch (error) {
    console.error('Error calculating pricing:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error calculating pricing'
    });
  }
});

/**
 * @desc    Get calendar prices for a listing
 * @route   GET /api/pricing/calendar/:listingId
 * @access  Public
 */
router.get('/calendar/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    const { startDate, endDate } = req.query;

    // Default to current month if not specified
    const start = startDate
      ? new Date(startDate)
      : new Date(new Date().setDate(1)); // First of current month
    const end = endDate
      ? new Date(endDate)
      : new Date(new Date(start).setMonth(start.getMonth() + 2)); // 2 months ahead

    const calendar = await dynamicPricingService.getCalendarPrices(
      listingId,
      start,
      end
    );

    res.status(200).json({
      success: true,
      data: calendar
    });
  } catch (error) {
    console.error('Error fetching calendar prices:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error fetching calendar prices'
    });
  }
});

/**
 * @desc    Set custom pricing for dates (host only)
 * @route   POST /api/pricing/:listingId/custom
 * @access  Private (host)
 */
router.post('/:listingId/custom', protect, async (req, res) => {
  try {
    const { listingId } = req.params;
    const { startDate, endDate, pricePerNight, reason, minNights, isBlocked } = req.body;

    // Verify ownership
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    if (listing.host.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this listing\'s pricing'
      });
    }

    if (!startDate || !endDate || pricePerNight === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide startDate, endDate, and pricePerNight'
      });
    }

    const updatedListing = await dynamicPricingService.setCustomPricing(
      listingId,
      new Date(startDate),
      new Date(endDate),
      pricePerNight,
      { reason, minNights, isBlocked }
    );

    res.status(200).json({
      success: true,
      message: 'Custom pricing set successfully',
      data: {
        customPricing: updatedListing.customPricing
      }
    });
  } catch (error) {
    console.error('Error setting custom pricing:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error setting custom pricing'
    });
  }
});

/**
 * @desc    Remove custom pricing for dates (host only)
 * @route   DELETE /api/pricing/:listingId/custom
 * @access  Private (host)
 */
router.delete('/:listingId/custom', protect, async (req, res) => {
  try {
    const { listingId } = req.params;
    const { startDate, endDate } = req.body;

    // Verify ownership
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    if (listing.host.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this listing\'s pricing'
      });
    }

    const updatedListing = await dynamicPricingService.removeCustomPricing(
      listingId,
      new Date(startDate),
      new Date(endDate)
    );

    res.status(200).json({
      success: true,
      message: 'Custom pricing removed successfully',
      data: {
        customPricing: updatedListing.customPricing
      }
    });
  } catch (error) {
    console.error('Error removing custom pricing:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error removing custom pricing'
    });
  }
});

/**
 * @desc    Bulk set custom pricing for multiple date ranges
 * @route   POST /api/pricing/:listingId/custom/bulk
 * @access  Private (host)
 */
router.post('/:listingId/custom/bulk', protect, async (req, res) => {
  try {
    const { listingId } = req.params;
    const { prices } = req.body; // Array of { startDate, endDate, pricePerNight, reason }

    // Verify ownership
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    if (listing.host.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this listing\'s pricing'
      });
    }

    if (!Array.isArray(prices) || prices.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of prices'
      });
    }

    // Apply each custom price
    for (const price of prices) {
      await dynamicPricingService.setCustomPricing(
        listingId,
        new Date(price.startDate),
        new Date(price.endDate),
        price.pricePerNight,
        { reason: price.reason, minNights: price.minNights, isBlocked: price.isBlocked }
      );
    }

    // Fetch updated listing
    const updatedListing = await Listing.findById(listingId);

    res.status(200).json({
      success: true,
      message: `${prices.length} custom prices set successfully`,
      data: {
        customPricing: updatedListing.customPricing
      }
    });
  } catch (error) {
    console.error('Error setting bulk custom pricing:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error setting bulk custom pricing'
    });
  }
});

/**
 * @desc    Add a pricing rule (host only)
 * @route   POST /api/pricing/:listingId/rules
 * @access  Private (host)
 */
router.post('/:listingId/rules', protect, async (req, res) => {
  try {
    const { listingId } = req.params;
    const rule = req.body;

    // Verify ownership
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    if (listing.host.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this listing\'s pricing'
      });
    }

    if (!rule.type || rule.adjustmentValue === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide rule type and adjustmentValue'
      });
    }

    const validTypes = ['weekend', 'weekday', 'haute_saison', 'basse_saison', 'long_sejour', 'very_long_sejour', 'last_minute', 'early_bird', 'event', 'custom'];
    if (!validTypes.includes(rule.type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid rule type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    const updatedListing = await dynamicPricingService.addPricingRule(listingId, rule);

    res.status(200).json({
      success: true,
      message: 'Pricing rule added successfully',
      data: {
        pricingRules: updatedListing.pricingRules
      }
    });
  } catch (error) {
    console.error('Error adding pricing rule:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error adding pricing rule'
    });
  }
});

/**
 * @desc    Update a pricing rule (host only)
 * @route   PUT /api/pricing/:listingId/rules/:ruleId
 * @access  Private (host)
 */
router.put('/:listingId/rules/:ruleId', protect, async (req, res) => {
  try {
    const { listingId, ruleId } = req.params;
    const updates = req.body;

    // Verify ownership
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    if (listing.host.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this listing\'s pricing'
      });
    }

    // Find and update the rule
    const ruleIndex = listing.pricingRules.findIndex(r => r._id.toString() === ruleId);
    if (ruleIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Pricing rule not found'
      });
    }

    // Update allowed fields
    const allowedUpdates = ['name', 'adjustmentType', 'adjustmentValue', 'minNights', 'seasonDates', 'daysBeforeCheckIn', 'isActive', 'priority'];
    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        listing.pricingRules[ruleIndex][key] = updates[key];
      }
    }

    await listing.save();

    res.status(200).json({
      success: true,
      message: 'Pricing rule updated successfully',
      data: {
        pricingRules: listing.pricingRules
      }
    });
  } catch (error) {
    console.error('Error updating pricing rule:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error updating pricing rule'
    });
  }
});

/**
 * @desc    Delete a pricing rule (host only)
 * @route   DELETE /api/pricing/:listingId/rules/:ruleId
 * @access  Private (host)
 */
router.delete('/:listingId/rules/:ruleId', protect, async (req, res) => {
  try {
    const { listingId, ruleId } = req.params;

    // Verify ownership
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    if (listing.host.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this listing\'s pricing'
      });
    }

    // Remove the rule
    listing.pricingRules = listing.pricingRules.filter(r => r._id.toString() !== ruleId);
    await listing.save();

    res.status(200).json({
      success: true,
      message: 'Pricing rule deleted successfully',
      data: {
        pricingRules: listing.pricingRules
      }
    });
  } catch (error) {
    console.error('Error deleting pricing rule:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error deleting pricing rule'
    });
  }
});

/**
 * @desc    Set length-of-stay discounts (host only)
 * @route   PUT /api/pricing/:listingId/discounts
 * @access  Private (host)
 */
router.put('/:listingId/discounts', protect, async (req, res) => {
  try {
    const { listingId } = req.params;
    const { weeklyDiscount, monthlyDiscount, newListingPromo } = req.body;

    // Verify ownership
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    if (listing.host.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this listing\'s pricing'
      });
    }

    // Update length discounts
    if (weeklyDiscount !== undefined || monthlyDiscount !== undefined) {
      await dynamicPricingService.setLengthDiscounts(
        listingId,
        weeklyDiscount,
        monthlyDiscount
      );
    }

    // Update new listing promo if provided
    if (newListingPromo !== undefined) {
      listing.discounts = listing.discounts || {};
      listing.discounts.newListingPromo = {
        enabled: newListingPromo.enabled || false,
        discountPercent: Math.min(50, Math.max(0, newListingPromo.discountPercent || 10)),
        maxBookings: newListingPromo.maxBookings || 3
      };
      await listing.save();
    }

    // Fetch updated listing
    const updatedListing = await Listing.findById(listingId);

    res.status(200).json({
      success: true,
      message: 'Discounts updated successfully',
      data: {
        discounts: updatedListing.discounts
      }
    });
  } catch (error) {
    console.error('Error updating discounts:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error updating discounts'
    });
  }
});

/**
 * @desc    Get all pricing settings for a listing (host only)
 * @route   GET /api/pricing/:listingId/settings
 * @access  Private (host)
 */
router.get('/:listingId/settings', protect, async (req, res) => {
  try {
    const { listingId } = req.params;

    const listing = await Listing.findById(listingId)
      .select('pricing pricingRules customPricing discounts');

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    if (listing.host && listing.host.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this listing\'s pricing settings'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        basePrice: listing.pricing?.basePrice,
        currency: listing.pricing?.currency,
        cleaningFee: listing.pricing?.cleaningFee,
        securityDeposit: listing.pricing?.securityDeposit,
        pricingRules: listing.pricingRules || [],
        customPricing: listing.customPricing || [],
        discounts: listing.discounts || {}
      }
    });
  } catch (error) {
    console.error('Error fetching pricing settings:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error fetching pricing settings'
    });
  }
});

module.exports = router;
