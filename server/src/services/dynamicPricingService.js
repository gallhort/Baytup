/**
 * Dynamic Pricing Calculator Service
 *
 * Calculates total price for bookings based on:
 * 1. Custom pricing (calendar-based, highest priority)
 * 2. Pricing rules (weekend, haute_saison, long_sejour, etc.)
 * 3. Base price (default)
 *
 * Also applies:
 * - Length-of-stay discounts (weekly, monthly)
 * - New listing promotions
 * - Cleaning fees
 * - Service fees (8% guest fee)
 *
 * Baytup Fee Structure:
 * - Guest Service Fee: 8% of subtotal
 * - Host Commission: 3% of host earnings (applied at payout)
 */

const Listing = require('../models/Listing');

// Service fee percentage (charged to guest)
const GUEST_SERVICE_FEE_PERCENT = 8;

class DynamicPricingService {
  /**
   * Calculate total pricing for a booking
   * @param {Object} listing - The listing document (or ID)
   * @param {Date} startDate - Check-in date
   * @param {Date} endDate - Check-out date
   * @param {Object} options - Additional options
   * @returns {Object} Detailed pricing breakdown
   */
  async calculateBookingPrice(listing, startDate, endDate, options = {}) {
    // Fetch listing if ID provided
    if (typeof listing === 'string' || listing._bsontype === 'ObjectID') {
      listing = await Listing.findById(listing);
      if (!listing) {
        throw new Error('Listing not found');
      }
    }

    const checkIn = new Date(startDate);
    const checkOut = new Date(endDate);
    checkIn.setHours(0, 0, 0, 0);
    checkOut.setHours(0, 0, 0, 0);

    // Calculate number of nights
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

    if (nights <= 0) {
      throw new Error('Invalid date range: checkout must be after checkin');
    }

    // Check minimum stay
    const minStay = listing.availability?.minStay || 1;
    if (nights < minStay) {
      throw new Error(`Minimum stay is ${minStay} nights`);
    }

    // Check maximum stay
    const maxStay = listing.availability?.maxStay || 365;
    if (nights > maxStay) {
      throw new Error(`Maximum stay is ${maxStay} nights`);
    }

    // Calculate price for each night
    const nightlyPrices = [];
    const priceBreakdown = {
      baseNights: 0,
      customNights: 0,
      ruleNights: {
        weekend: 0,
        weekday: 0,
        haute_saison: 0,
        basse_saison: 0,
        event: 0
      }
    };

    let currentDate = new Date(checkIn);
    for (let i = 0; i < nights; i++) {
      // Check if date is blocked
      if (listing.isDateBlocked(currentDate)) {
        throw new Error(`Date ${currentDate.toISOString().split('T')[0]} is not available`);
      }

      const priceInfo = this.getPriceForDateWithDetails(listing, currentDate);
      nightlyPrices.push({
        date: new Date(currentDate),
        price: priceInfo.price,
        source: priceInfo.source,
        rule: priceInfo.rule
      });

      // Track price sources for breakdown
      if (priceInfo.source === 'custom') {
        priceBreakdown.customNights++;
      } else if (priceInfo.source === 'rule') {
        priceBreakdown.ruleNights[priceInfo.rule] = (priceBreakdown.ruleNights[priceInfo.rule] || 0) + 1;
      } else {
        priceBreakdown.baseNights++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate subtotal (sum of all nightly prices)
    const subtotal = nightlyPrices.reduce((sum, np) => sum + np.price, 0);

    // Calculate average nightly rate
    const averageNightlyRate = Math.round(subtotal / nights);

    // Apply length-of-stay discounts
    let discount = 0;
    let discountType = null;
    let discountPercent = 0;

    if (nights >= 28 && listing.discounts?.monthlyDiscount > 0) {
      // Monthly discount
      discountPercent = listing.discounts.monthlyDiscount;
      discountType = 'monthly';
      discount = Math.round(subtotal * discountPercent / 100);
    } else if (nights >= 7 && listing.discounts?.weeklyDiscount > 0) {
      // Weekly discount
      discountPercent = listing.discounts.weeklyDiscount;
      discountType = 'weekly';
      discount = Math.round(subtotal * discountPercent / 100);
    }

    // Check for long stay pricing rules
    const longStayRule = this.findLongStayRule(listing, nights);
    if (longStayRule && !discount) {
      // Apply long stay rule if no length discount already applied
      const adjustment = this.calculateRuleAdjustment(longStayRule, subtotal);
      if (adjustment < 0) {
        discount = Math.abs(adjustment);
        discountType = longStayRule.type;
        discountPercent = longStayRule.adjustmentType === 'percentage'
          ? Math.abs(longStayRule.adjustmentValue)
          : Math.round(Math.abs(adjustment) / subtotal * 100);
      }
    }

    // Apply new listing promotion if eligible
    let promoDiscount = 0;
    if (listing.discounts?.newListingPromo?.enabled &&
        listing.stats?.bookings < listing.discounts.newListingPromo.maxBookings) {
      promoDiscount = Math.round((subtotal - discount) * listing.discounts.newListingPromo.discountPercent / 100);
    }

    // Cap total discount at 50% of subtotal to prevent abuse (P1 #16)
    const totalDiscount = discount + promoDiscount;
    const maxDiscount = Math.round(subtotal * 0.5);
    if (totalDiscount > maxDiscount) {
      const ratio = maxDiscount / totalDiscount;
      discount = Math.round(discount * ratio);
      promoDiscount = Math.round(promoDiscount * ratio);
    }

    // Calculate final subtotal after discounts
    const subtotalAfterDiscount = subtotal - discount - promoDiscount;

    // Add cleaning fee
    const cleaningFee = listing.pricing?.cleaningFee || 0;

    // Round helper: EUR uses 2 decimals, DZD uses integers (P1 #15)
    const isEUR = (listing.pricing.currency || 'DZD').toUpperCase() === 'EUR';
    const roundAmount = (amount) => isEUR ? Math.round(amount * 100) / 100 : Math.round(amount);

    // Calculate guest service fee (8% of subtotal after discount + cleaning)
    const guestServiceFee = roundAmount((subtotalAfterDiscount + cleaningFee) * GUEST_SERVICE_FEE_PERCENT / 100);

    // Calculate total
    const totalAmount = roundAmount(subtotalAfterDiscount + cleaningFee + guestServiceFee);

    // Security deposit (not included in total, just for reference)
    const securityDeposit = listing.pricing?.securityDeposit || 0;

    return {
      // Basic info
      listing: {
        id: listing._id,
        title: listing.title,
        currency: listing.pricing.currency
      },
      dates: {
        checkIn: checkIn,
        checkOut: checkOut,
        nights: nights
      },

      // Pricing breakdown
      pricing: {
        basePrice: listing.pricing.basePrice,
        averageNightlyRate,
        nights,

        // Subtotal before discounts
        subtotal,

        // Discounts
        discount: {
          amount: discount,
          type: discountType,
          percent: discountPercent
        },
        promoDiscount: {
          amount: promoDiscount,
          isNewListingPromo: promoDiscount > 0
        },

        // Subtotal after discounts
        subtotalAfterDiscount,

        // Fees
        cleaningFee,
        guestServiceFee,
        serviceFeePercent: GUEST_SERVICE_FEE_PERCENT,

        // Total
        totalAmount,

        // Security deposit (separate)
        securityDeposit
      },

      // Detailed nightly breakdown
      nightlyBreakdown: nightlyPrices,

      // Summary of price sources
      priceSourceBreakdown: priceBreakdown,

      // For display
      summary: this.generatePricingSummary({
        nights,
        averageNightlyRate,
        subtotal,
        discount,
        discountType,
        discountPercent,
        promoDiscount,
        cleaningFee,
        guestServiceFee,
        totalAmount,
        currency: listing.pricing.currency
      })
    };
  }

  /**
   * Get price for a specific date with source information
   */
  getPriceForDateWithDetails(listing, date) {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // 1. Check customPricing first
    const customPrice = listing.customPricing?.find(cp => {
      const start = new Date(cp.startDate);
      const end = new Date(cp.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return targetDate >= start && targetDate <= end && !cp.isBlocked;
    });

    if (customPrice) {
      return {
        price: customPrice.pricePerNight,
        source: 'custom',
        rule: customPrice.reason || 'custom_price'
      };
    }

    // 2. Check pricingRules
    const basePrice = listing.pricing.basePrice;
    const activeRules = (listing.pricingRules || [])
      .filter(rule => rule.isActive && !['long_sejour', 'very_long_sejour', 'last_minute', 'early_bird'].includes(rule.type))
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    for (const rule of activeRules) {
      if (this.ruleApplies(rule, targetDate)) {
        return {
          price: this.applyRule(rule, basePrice),
          source: 'rule',
          rule: rule.type
        };
      }
    }

    // 3. Return base price
    return {
      price: basePrice,
      source: 'base',
      rule: null
    };
  }

  /**
   * Check if a pricing rule applies to a date
   */
  ruleApplies(rule, date) {
    const dayOfWeek = date.getDay();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    switch (rule.type) {
      case 'weekend':
        return dayOfWeek === 5 || dayOfWeek === 6;

      case 'weekday':
        return dayOfWeek >= 0 && dayOfWeek <= 4;

      case 'haute_saison':
      case 'basse_saison':
      case 'event':
        if (!rule.seasonDates) return false;
        return this.isDateInSeason(month, day, rule.seasonDates);

      default:
        return false;
    }
  }

  /**
   * Check if date is within seasonal range
   */
  isDateInSeason(month, day, seasonDates) {
    const { startMonth, startDay, endMonth, endDay } = seasonDates;

    if (startMonth > endMonth || (startMonth === endMonth && startDay > endDay)) {
      return (month > startMonth || (month === startMonth && day >= startDay)) ||
             (month < endMonth || (month === endMonth && day <= endDay));
    }

    if (month > startMonth && month < endMonth) return true;
    if (month === startMonth && day >= startDay) return true;
    if (month === endMonth && day <= endDay) return true;

    return false;
  }

  /**
   * Apply pricing rule to base price
   */
  applyRule(rule, basePrice) {
    switch (rule.adjustmentType) {
      case 'percentage':
        return Math.round(basePrice * (1 + rule.adjustmentValue / 100));
      case 'fixed':
        return Math.round(basePrice + rule.adjustmentValue);
      case 'absolute':
        return rule.adjustmentValue;
      default:
        return basePrice;
    }
  }

  /**
   * Find applicable long stay rule
   */
  findLongStayRule(listing, nights) {
    const longStayRules = (listing.pricingRules || [])
      .filter(rule =>
        rule.isActive &&
        ['long_sejour', 'very_long_sejour'].includes(rule.type) &&
        nights >= (rule.minNights || 7)
      )
      .sort((a, b) => (b.minNights || 7) - (a.minNights || 7));

    return longStayRules[0] || null;
  }

  /**
   * Calculate rule adjustment amount
   */
  calculateRuleAdjustment(rule, subtotal) {
    switch (rule.adjustmentType) {
      case 'percentage':
        return Math.round(subtotal * rule.adjustmentValue / 100);
      case 'fixed':
        return rule.adjustmentValue;
      default:
        return 0;
    }
  }

  /**
   * Generate human-readable pricing summary
   */
  generatePricingSummary(data) {
    const {
      nights, averageNightlyRate, subtotal, discount, discountType,
      discountPercent, promoDiscount, cleaningFee, guestServiceFee,
      totalAmount, currency
    } = data;

    const lines = [];

    // Nightly rate
    lines.push(`${averageNightlyRate.toLocaleString()} ${currency} x ${nights} nuit${nights > 1 ? 's' : ''}`);

    // Subtotal
    lines.push(`Sous-total: ${subtotal.toLocaleString()} ${currency}`);

    // Discounts
    if (discount > 0) {
      const discountLabels = {
        weekly: 'Réduction séjour long (semaine)',
        monthly: 'Réduction séjour long (mois)',
        long_sejour: 'Réduction séjour long',
        very_long_sejour: 'Réduction très long séjour'
      };
      lines.push(`${discountLabels[discountType] || 'Réduction'} (-${discountPercent}%): -${discount.toLocaleString()} ${currency}`);
    }

    if (promoDiscount > 0) {
      lines.push(`Promo nouvelle annonce: -${promoDiscount.toLocaleString()} ${currency}`);
    }

    // Cleaning fee
    if (cleaningFee > 0) {
      lines.push(`Frais de ménage: ${cleaningFee.toLocaleString()} ${currency}`);
    }

    // Service fee
    lines.push(`Frais de service (8%): ${guestServiceFee.toLocaleString()} ${currency}`);

    // Total
    lines.push(`---`);
    lines.push(`Total: ${totalAmount.toLocaleString()} ${currency}`);

    return lines.join('\n');
  }

  /**
   * Get calendar prices for a date range
   * Useful for displaying the calendar with prices
   */
  async getCalendarPrices(listingId, startDate, endDate) {
    const listing = await Listing.findById(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const calendar = [];
    let currentDate = new Date(start);

    while (currentDate <= end) {
      const isBlocked = listing.isDateBlocked(currentDate);
      const priceInfo = isBlocked
        ? { price: 0, source: 'blocked', rule: null }
        : this.getPriceForDateWithDetails(listing, currentDate);

      calendar.push({
        date: new Date(currentDate),
        dateString: currentDate.toISOString().split('T')[0],
        price: priceInfo.price,
        source: priceInfo.source,
        rule: priceInfo.rule,
        isBlocked,
        isAvailable: !isBlocked,
        dayOfWeek: currentDate.getDay()
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      listing: {
        id: listing._id,
        title: listing.title,
        basePrice: listing.pricing.basePrice,
        currency: listing.pricing.currency
      },
      calendar
    };
  }

  /**
   * Add or update custom pricing for a date range
   */
  async setCustomPricing(listingId, startDate, endDate, pricePerNight, options = {}) {
    const listing = await Listing.findById(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    const { reason, minNights, isBlocked } = options;

    // Initialize customPricing array if needed
    if (!listing.customPricing) {
      listing.customPricing = [];
    }

    // Remove overlapping custom prices
    const start = new Date(startDate);
    const end = new Date(endDate);

    listing.customPricing = listing.customPricing.filter(cp => {
      const cpStart = new Date(cp.startDate);
      const cpEnd = new Date(cp.endDate);
      // Remove if overlapping
      return cpEnd < start || cpStart > end;
    });

    // Add new custom pricing
    listing.customPricing.push({
      startDate: start,
      endDate: end,
      pricePerNight,
      reason: reason || '',
      minNights: minNights || 1,
      isBlocked: isBlocked || false
    });

    await listing.save();

    return listing;
  }

  /**
   * Remove custom pricing for a date range
   */
  async removeCustomPricing(listingId, startDate, endDate) {
    const listing = await Listing.findById(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    listing.customPricing = listing.customPricing.filter(cp => {
      const cpStart = new Date(cp.startDate);
      const cpEnd = new Date(cp.endDate);
      return cpEnd < start || cpStart > end;
    });

    await listing.save();

    return listing;
  }

  /**
   * Add a pricing rule
   */
  async addPricingRule(listingId, rule) {
    const listing = await Listing.findById(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    if (!listing.pricingRules) {
      listing.pricingRules = [];
    }

    listing.pricingRules.push({
      type: rule.type,
      name: rule.name || '',
      adjustmentType: rule.adjustmentType || 'percentage',
      adjustmentValue: rule.adjustmentValue,
      minNights: rule.minNights || 1,
      seasonDates: rule.seasonDates || null,
      daysBeforeCheckIn: rule.daysBeforeCheckIn || null,
      isActive: rule.isActive !== false,
      priority: rule.priority || 0
    });

    await listing.save();

    return listing;
  }

  /**
   * Set length-of-stay discounts
   */
  async setLengthDiscounts(listingId, weeklyDiscount, monthlyDiscount) {
    const listing = await Listing.findById(listingId);
    if (!listing) {
      throw new Error('Listing not found');
    }

    if (!listing.discounts) {
      listing.discounts = {};
    }

    listing.discounts.weeklyDiscount = Math.min(100, Math.max(0, weeklyDiscount || 0));
    listing.discounts.monthlyDiscount = Math.min(100, Math.max(0, monthlyDiscount || 0));

    await listing.save();

    return listing;
  }
}

module.exports = new DynamicPricingService();
