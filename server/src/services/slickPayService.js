const axios = require('axios');

/**
 * Slick Pay Payment Service
 * Handles all payment operations with Slick Pay API
 */
class SlickPayService {
  constructor() {
    // Use test API for development, production API for production
    this.baseURL = process.env.NODE_ENV === 'production'
      ? 'https://prodapi.slick-pay.com/api/v2'
      : 'https://devapi.slick-pay.com/api/v2';

    // Use test key for development, production key for production
    this.apiKey = process.env.SLICK_PAY_API_KEY || '54|BZ7F6N4KwSD46GEXToOv3ZBpJpf7WVxnBzK5cOE6';

    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }
    });
  }

  /**
   * Format address as string for Slick Pay API
   * @param {string|Object} address - Address data (string or object)
   * @returns {string} Formatted address string (minimum 5 characters)
   */
  formatAddressAsString(address) {
    if (typeof address === 'string') {
      return address.length >= 5 ? address : 'Algiers, Algeria';
    }

    if (typeof address === 'object' && address !== null) {
      const parts = [];
      if (address.street) parts.push(address.street);
      if (address.city) parts.push(address.city);
      if (address.state) parts.push(address.state);
      if (address.country) parts.push(address.country);

      const result = parts.join(', ');
      return result.length >= 5 ? result : 'Algiers, Algeria';
    }

    return 'Algiers, Algeria'; // Default fallback (must be at least 5 characters)
  }

  /**
   * Calculate commission for invoice
   * @param {number} amount - Amount in DZD (e.g., 100 = 100 DZD)
   * @returns {Promise<{amount: number, commission: number}>}
   */
  async calculateInvoiceCommission(amount) {
    try {
      const response = await this.axiosInstance.post('/users/invoices/commission', {
        amount
      });

      return response.data;
    } catch (error) {
      console.error('Error calculating invoice commission:', error.response?.data || error.message);
      throw new Error('Failed to calculate payment commission');
    }
  }

  /**
   * Create invoice for booking payment
   * @param {Object} invoiceData - Invoice details
   * @param {number} invoiceData.amount - Total amount in DZD (NOT centimes)
   * @param {string} invoiceData.returnUrl - URL to redirect after payment
   * @param {Object} invoiceData.guest - Guest information
   * @param {Array} invoiceData.items - Invoice line items (prices in DZD)
   * @param {string} invoiceData.bookingId - Booking ID for webhook metadata
   * @returns {Promise<{id: number, url: string}>}
   */
  async createInvoice(invoiceData) {
    try {
      const { amount, returnUrl, guest, items, bookingId, note } = invoiceData;

      const payload = {
        amount,
        url: returnUrl,
        firstname: guest.firstName,
        lastname: guest.lastName,
        phone: guest.phone || '',
        email: guest.email || '',
        address: this.formatAddressAsString(guest.address),
        items: items.map(item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        webhook_url: `${process.env.API_URL || 'http://localhost:5000'}/api/webhooks/slickpay`,
        webhook_signature: process.env.SLICK_PAY_WEBHOOK_SECRET || 'baytup-webhook-secret',
        webhook_meta_data: {
          bookingId,
          platform: 'baytup'
        }
      };

      if (note) {
        payload.note = note;
      }

      const response = await this.axiosInstance.post('/users/invoices', payload);

      return {
        invoiceId: response.data.id,
        paymentUrl: response.data.url,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error creating invoice:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to create payment invoice');
    }
  }

  /**
   * Get invoice details and payment status
   * @param {string|number} invoiceId - Slick Pay invoice ID
   * @returns {Promise<{success: boolean, completed: boolean, data: Object}>}
   */
  async getInvoiceStatus(invoiceId) {
    try {
      console.log('📡 Slick Pay API: Getting invoice status for:', invoiceId);
      console.log('   API URL:', `${this.baseURL}/users/invoices/${invoiceId}`);

      const response = await this.axiosInstance.get(`/users/invoices/${invoiceId}`);

      console.log('✅ Slick Pay API: Raw response:', {
        status: response.status,
        data: response.data
      });

      return {
        success: response.data.success === 1,
        completed: response.data.completed === 1,
        paymentStatus: response.data.data?.payment_status || 'unpaid',
        data: response.data.data
      };
    } catch (error) {
      console.error('❌ Slick Pay API Error:', {
        invoiceId,
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      });
      throw new Error('Failed to check payment status: ' + (error.response?.data?.message || error.message));
    }
  }

  /**
   * List all invoices with pagination
   * @param {Object} options - Query options
   * @param {number} options.page - Page number
   * @param {number} options.offset - Offset for pagination
   * @returns {Promise<{data: Array, meta: Object}>}
   */
  async listInvoices({ page = 1, offset = 0 } = {}) {
    try {
      const response = await this.axiosInstance.get('/users/invoices', {
        params: { page, offset }
      });

      return {
        data: response.data.data,
        meta: response.data.meta
      };
    } catch (error) {
      console.error('Error listing invoices:', error.response?.data || error.message);
      throw new Error('Failed to retrieve invoices');
    }
  }

  /**
   * Update an existing invoice
   * @param {string|number} invoiceId - Invoice ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<{id: number, url: string}>}
   */
  async updateInvoice(invoiceId, updateData) {
    try {
      const response = await this.axiosInstance.put(`/users/invoices/${invoiceId}`, updateData);

      return {
        invoiceId: response.data.id,
        paymentUrl: response.data.url,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error updating invoice:', error.response?.data || error.message);
      throw new Error('Failed to update invoice');
    }
  }

  /**
   * Delete an invoice
   * @param {string|number} invoiceId - Invoice ID
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async deleteInvoice(invoiceId) {
    try {
      const response = await this.axiosInstance.delete(`/users/invoices/${invoiceId}`);

      return {
        success: response.data.success === 1,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error deleting invoice:', error.response?.data || error.message);
      throw new Error('Failed to delete invoice');
    }
  }

  /**
   * Verify webhook signature
   * @param {Object} payload - Webhook payload
   * @param {string} signature - Signature from webhook
   * @returns {boolean}
   */
  verifyWebhookSignature(payload, signature) {
    const crypto = require('crypto');
    const secret = process.env.SLICK_PAY_WEBHOOK_SECRET || 'baytup-webhook-secret';

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return expectedSignature === signature;
  }

  /**
   * Format amount from DZD to centimes (Slick Pay uses centimes)
   * @param {number} amountInDZD - Amount in DZD
   * @returns {number} Amount in centimes
   */
  formatAmountToCentimes(amountInDZD) {
    return Math.round(amountInDZD * 100);
  }

  /**
   * Format amount from centimes to DZD
   * @param {number} amountInCentimes - Amount in centimes
   * @returns {number} Amount in DZD
   */
  formatAmountToDZD(amountInCentimes) {
    return amountInCentimes / 100;
  }
}

module.exports = new SlickPayService();
