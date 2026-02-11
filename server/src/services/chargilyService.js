/**
 * Chargily Pay Service
 * Handles all payment operations with Chargily Pay API V2
 * Supports CIB and EDAHABIA cards for DZD payments in Algeria
 *
 * Documentation: https://dev.chargily.com/pay-v2/introduction
 */

const crypto = require('crypto');

// Lazy load ChargilyClient to avoid crash if package not installed
let ChargilyClient;
try {
  ChargilyClient = require('@chargily/chargily-pay').ChargilyClient;
} catch (err) {
  console.warn('[ChargilyService] @chargily/chargily-pay package not installed. Run: npm install @chargily/chargily-pay');
  ChargilyClient = null;
}

class ChargilyService {
  constructor() {
    // Initialize Chargily client
    this.apiKey = process.env.CHARGILY_API_SECRET_KEY;
    this.mode = process.env.NODE_ENV === 'production' ? 'live' : 'test';
    this.client = null;

    if (!ChargilyClient) {
      console.warn('[ChargilyService] Package not installed. Chargily payments will not work.');
      return;
    }

    if (!this.apiKey) {
      console.warn('[ChargilyService] WARNING: CHARGILY_API_SECRET_KEY not set. Payment service will not work.');
      return;
    }

    try {
      this.client = new ChargilyClient({
        api_key: this.apiKey,
        mode: this.mode
      });
      console.log(`[ChargilyService] Initialized in ${this.mode} mode`);
    } catch (err) {
      console.error('[ChargilyService] Failed to initialize:', err.message);
    }
  }

  /**
   * Create a checkout session for booking payment
   * @param {Object} checkoutData - Checkout details
   * @param {number} checkoutData.amount - Amount in DZD (NOT centimes)
   * @param {string} checkoutData.successUrl - URL to redirect after successful payment
   * @param {string} checkoutData.failureUrl - URL to redirect after failed payment
   * @param {string} checkoutData.bookingId - Booking ID for reference
   * @param {Object} checkoutData.customer - Customer information
   * @param {string} checkoutData.description - Payment description
   * @param {string} checkoutData.paymentMethod - 'edahabia' or 'cib' (default: edahabia)
   * @returns {Promise<{checkoutId: string, checkoutUrl: string}>}
   */
  async createCheckout(checkoutData) {
    if (!this.client) {
      throw new Error('Chargily service not configured. Please install @chargily/chargily-pay and set CHARGILY_API_SECRET_KEY.');
    }

    try {
      const {
        amount,
        successUrl,
        failureUrl,
        bookingId,
        customer,
        description,
        paymentMethod = 'edahabia'
      } = checkoutData;

      console.log('[ChargilyService] Creating checkout:', {
        amount,
        bookingId,
        paymentMethod,
        mode: this.mode
      });

      // Build webhook URL
      const webhookUrl = `${process.env.API_URL || 'http://localhost:5000'}/api/webhooks/chargily`;

      // Create checkout with Chargily
      const checkout = await this.client.createCheckout({
        amount: amount,
        currency: 'dzd',
        payment_method: paymentMethod, // 'edahabia', 'cib', or 'chargily_app'
        success_url: successUrl,
        failure_url: failureUrl,
        webhook_endpoint: webhookUrl,
        description: description || `Réservation Baytup #${bookingId}`,
        locale: 'fr', // French locale
        metadata: {
          bookingId: bookingId,
          platform: 'baytup',
          customerEmail: customer?.email || '',
          customerName: customer?.firstName ? `${customer.firstName} ${customer.lastName}` : ''
        }
      });

      console.log('[ChargilyService] Checkout created:', {
        checkoutId: checkout.id,
        status: checkout.status,
        checkoutUrl: checkout.checkout_url
      });

      return {
        checkoutId: checkout.id,
        checkoutUrl: checkout.checkout_url,
        status: checkout.status,
        amount: checkout.amount,
        currency: checkout.currency
      };
    } catch (error) {
      console.error('[ChargilyService] Error creating checkout:', {
        message: error.message,
        response: error.response?.data
      });
      throw new Error(error.response?.data?.message || error.message || 'Failed to create payment checkout');
    }
  }

  /**
   * Get checkout status
   * @param {string} checkoutId - Chargily checkout ID
   * @returns {Promise<Object>} - Checkout details
   */
  async getCheckoutStatus(checkoutId) {
    if (!this.client) {
      throw new Error('Chargily service not configured.');
    }

    try {
      console.log('[ChargilyService] Getting checkout status:', checkoutId);

      const checkout = await this.client.getCheckout(checkoutId);

      console.log('[ChargilyService] Checkout status:', {
        id: checkout.id,
        status: checkout.status,
        payment_method: checkout.payment_method
      });

      return {
        success: true,
        checkoutId: checkout.id,
        status: checkout.status, // 'pending', 'paid', 'failed', 'canceled', 'expired'
        isPaid: checkout.status === 'paid',
        amount: checkout.amount,
        currency: checkout.currency,
        paymentMethod: checkout.payment_method,
        metadata: checkout.metadata,
        paidAt: checkout.paid_at
      };
    } catch (error) {
      console.error('[ChargilyService] Error getting checkout status:', error.message);
      throw new Error('Failed to check payment status: ' + error.message);
    }
  }

  /**
   * Verify webhook signature
   * Uses HMAC-SHA256 with the API secret key
   * @param {Buffer|string} payload - Raw request body
   * @param {string} signature - Signature from webhook header
   * @returns {boolean}
   */
  verifyWebhookSignature(payload, signature) {
    if (!signature) {
      console.warn('[ChargilyService] No signature provided for webhook');
      return false;
    }

    try {
      // Convert payload to string if it's a Buffer
      const payloadString = Buffer.isBuffer(payload) ? payload.toString('utf8') : payload;

      // Calculate expected signature using HMAC-SHA256
      const expectedSignature = crypto
        .createHmac('sha256', this.apiKey)
        .update(payloadString)
        .digest('hex');

      // Use timing-safe comparison
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

      if (!isValid) {
        console.warn('[ChargilyService] Invalid webhook signature');
      }

      return isValid;
    } catch (error) {
      console.error('[ChargilyService] Signature verification error:', error.message);
      return false;
    }
  }

  /**
   * Handle webhook event
   * @param {Object} event - Webhook event payload
   * @returns {Object} - Processed event data
   */
  processWebhookEvent(event) {
    const { type, data } = event;

    console.log('[ChargilyService] Processing webhook event:', {
      type,
      checkoutId: data?.id,
      status: data?.status
    });

    switch (type) {
      case 'checkout.paid':
        return {
          eventType: 'payment_success',
          checkoutId: data.id,
          status: 'paid',
          amount: data.amount,
          currency: data.currency,
          metadata: data.metadata,
          paymentMethod: data.payment_method,
          paidAt: data.paid_at || new Date().toISOString()
        };

      case 'checkout.failed':
        return {
          eventType: 'payment_failed',
          checkoutId: data.id,
          status: 'failed',
          metadata: data.metadata,
          reason: data.failure_reason || 'Payment failed'
        };

      case 'checkout.canceled':
        return {
          eventType: 'payment_canceled',
          checkoutId: data.id,
          status: 'canceled',
          metadata: data.metadata
        };

      case 'checkout.expired':
        return {
          eventType: 'payment_expired',
          checkoutId: data.id,
          status: 'expired',
          metadata: data.metadata
        };

      default:
        console.warn('[ChargilyService] Unknown webhook event type:', type);
        return {
          eventType: 'unknown',
          checkoutId: data?.id,
          rawEvent: event
        };
    }
  }

  /**
   * Create a customer in Chargily (optional, for returning customers)
   * @param {Object} customerData - Customer details
   * @returns {Promise<Object>} - Created customer
   */
  async createCustomer(customerData) {
    try {
      const customer = await this.client.createCustomer({
        name: customerData.name,
        email: customerData.email,
        phone: customerData.phone,
        address: customerData.address,
        metadata: customerData.metadata
      });

      return {
        customerId: customer.id,
        email: customer.email,
        name: customer.name
      };
    } catch (error) {
      console.error('[ChargilyService] Error creating customer:', error.message);
      throw error;
    }
  }

  /**
   * Check if service is properly configured
   * @returns {boolean}
   */
  isConfigured() {
    return !!this.apiKey;
  }

  /**
   * Get current mode (test/live)
   * @returns {string}
   */
  getMode() {
    return this.mode;
  }
}

module.exports = new ChargilyService();
