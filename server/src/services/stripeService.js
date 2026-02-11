/**
 * Stripe Payment Service
 * Handles EUR payments as alternative to SlickPay (DZD)
 * Uses Payment Intents for embedded checkout experience
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class StripeService {
  constructor() {
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  }

  /**
   * Create a Payment Intent for embedded checkout
   * @param {Object} paymentData - Payment details
   * @returns {Promise<Object>} - Stripe Payment Intent
   */
  async createPaymentIntent(paymentData) {
    const {
      amount,
      currency = 'eur',
      bookingId,
      guestEmail,
      guestName,
      listingTitle,
      metadata = {}
    } = paymentData;

    try {
      // Convert to cents (Stripe uses smallest currency unit)
      const amountInCents = Math.round(amount * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: currency.toLowerCase(),
        receipt_email: guestEmail,
        description: `Baytup - Réservation: ${listingTitle}`,
        metadata: {
          bookingId: bookingId.toString(),
          platform: 'baytup',
          guestName,
          listingTitle,
          ...metadata
        },
        automatic_payment_methods: {
          enabled: true
        }
      });

      console.log(`[StripeService] Created Payment Intent: ${paymentIntent.id} for ${amount} ${currency}`);

      return {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: amount,
        currency: currency,
        status: paymentIntent.status
      };
    } catch (error) {
      console.error('[StripeService] Error creating Payment Intent:', error.message);
      throw error;
    }
  }

  /**
   * Retrieve a Payment Intent by ID
   * @param {String} paymentIntentId - Stripe Payment Intent ID
   * @returns {Promise<Object>} - Payment Intent details
   */
  async getPaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100, // Convert back from cents
        currency: paymentIntent.currency.toUpperCase(),
        chargeId: paymentIntent.latest_charge,
        metadata: paymentIntent.metadata,
        createdAt: new Date(paymentIntent.created * 1000)
      };
    } catch (error) {
      console.error('[StripeService] Error retrieving Payment Intent:', error.message);
      throw error;
    }
  }

  /**
   * Confirm a Payment Intent (server-side confirmation)
   * Usually not needed with automatic_payment_methods
   * @param {String} paymentIntentId - Stripe Payment Intent ID
   * @param {String} paymentMethodId - Stripe Payment Method ID
   * @returns {Promise<Object>} - Confirmed Payment Intent
   */
  async confirmPaymentIntent(paymentIntentId, paymentMethodId) {
    try {
      const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId
      });

      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
        chargeId: paymentIntent.latest_charge
      };
    } catch (error) {
      console.error('[StripeService] Error confirming Payment Intent:', error.message);
      throw error;
    }
  }

  /**
   * Create a refund for a charge
   * @param {String} chargeId - Stripe Charge ID
   * @param {Number} amount - Amount to refund (optional, full refund if not provided)
   * @param {String} reason - Refund reason
   * @returns {Promise<Object>} - Refund details
   */
  async createRefund(chargeId, amount = null, reason = 'requested_by_customer') {
    try {
      const refundData = {
        charge: chargeId,
        reason: reason
      };

      // If amount provided, convert to cents
      if (amount !== null && amount > 0) {
        refundData.amount = Math.round(amount * 100);
      }

      const refund = await stripe.refunds.create(refundData);

      console.log(`[StripeService] Created refund: ${refund.id} for charge ${chargeId}`);

      return {
        refundId: refund.id,
        status: refund.status,
        amount: refund.amount / 100,
        currency: refund.currency.toUpperCase()
      };
    } catch (error) {
      console.error('[StripeService] Error creating refund:', error.message);
      throw error;
    }
  }

  /**
   * Create partial refund
   * @param {String} chargeId - Stripe Charge ID
   * @param {Number} amount - Partial amount to refund
   * @returns {Promise<Object>} - Refund details
   */
  async createPartialRefund(chargeId, amount) {
    return this.createRefund(chargeId, amount, 'requested_by_customer');
  }

  /**
   * Verify webhook signature and construct event
   * @param {Buffer} payload - Raw request body
   * @param {String} signature - Stripe signature header
   * @returns {Object} - Stripe Event
   */
  verifyWebhookSignature(payload, signature) {
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      );
      return event;
    } catch (error) {
      console.error('[StripeService] Webhook signature verification failed:', error.message);
      throw new Error(`Webhook signature verification failed: ${error.message}`);
    }
  }

  /**
   * Cancel a Payment Intent
   * @param {String} paymentIntentId - Stripe Payment Intent ID
   * @returns {Promise<Object>} - Cancelled Payment Intent
   */
  async cancelPaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);

      console.log(`[StripeService] Cancelled Payment Intent: ${paymentIntentId}`);

      return {
        id: paymentIntent.id,
        status: paymentIntent.status
      };
    } catch (error) {
      console.error('[StripeService] Error cancelling Payment Intent:', error.message);
      throw error;
    }
  }

  /**
   * Create or get a Stripe Customer
   * @param {Object} user - User object with email and name
   * @returns {Promise<Object>} - Stripe Customer
   */
  async getOrCreateCustomer(user) {
    try {
      // Check if customer already exists
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1
      });

      if (customers.data.length > 0) {
        return customers.data[0];
      }

      // Create new customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: {
          userId: user._id.toString(),
          platform: 'baytup'
        }
      });

      console.log(`[StripeService] Created new customer: ${customer.id} for ${user.email}`);

      return customer;
    } catch (error) {
      console.error('[StripeService] Error with customer:', error.message);
      throw error;
    }
  }

  /**
   * Retrieve a refund by ID
   * @param {String} refundId - Stripe Refund ID
   * @returns {Promise<Object>} - Refund details
   */
  async getRefund(refundId) {
    try {
      const refund = await stripe.refunds.retrieve(refundId);

      return {
        id: refund.id,
        status: refund.status,
        amount: refund.amount / 100,
        currency: refund.currency.toUpperCase()
      };
    } catch (error) {
      console.error('[StripeService] Error retrieving refund:', error.message);
      throw error;
    }
  }

  /**
   * List charges for a customer
   * @param {String} customerId - Stripe Customer ID
   * @param {Number} limit - Number of charges to retrieve
   * @returns {Promise<Array>} - List of charges
   */
  async listCharges(customerId, limit = 10) {
    try {
      const charges = await stripe.charges.list({
        customer: customerId,
        limit: limit
      });

      return charges.data.map(charge => ({
        id: charge.id,
        amount: charge.amount / 100,
        currency: charge.currency.toUpperCase(),
        status: charge.status,
        refunded: charge.refunded,
        created: new Date(charge.created * 1000)
      }));
    } catch (error) {
      console.error('[StripeService] Error listing charges:', error.message);
      throw error;
    }
  }

  /**
   * Get Stripe publishable key (for frontend)
   * @returns {String} - Publishable key
   */
  getPublishableKey() {
    return process.env.STRIPE_PUBLISHABLE_KEY;
  }

  /**
   * Check if Stripe is configured
   * @returns {Boolean}
   */
  isConfigured() {
    return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY);
  }

  // ============================================================
  // STRIPE CONNECT - Host Onboarding & Payouts
  // ============================================================

  /**
   * Create a Connected Account for a host
   * @param {Object} user - User object
   * @returns {Promise<Object>} - Connected Account
   */
  async createConnectedAccount(user) {
    try {
      // Préparer les données individual avec le maximum d'informations
      const individualData = {
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName
      };

      // Ajouter le téléphone si disponible
      if (user.phone || user.phoneNumber) {
        individualData.phone = user.phone || user.phoneNumber;
      }

      const account = await stripe.accounts.create({
        type: 'express',
        country: 'FR', // Default to France for EUR, adjust based on host country
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true }
        },
        business_type: 'individual',
        individual: individualData,
        // ✅ Pré-remplir TOUT le profil business pour minimiser les champs demandés
        business_profile: {
          name: `${user.firstName} ${user.lastName}`, // Nom du compte
          // ✅ URL générée dynamiquement - Profil hôte sur Baytup
          url: `https://baytup.fr/host/${user._id}`, // Lien vers le profil public de l'hôte
          mcc: '7011', // ⚡ MCC FORCÉ: Hotels/Motels/Resorts
          // ⚠️ NOTE: Même avec MCC défini, Stripe peut QUAND MÊME demander à l'utilisateur
          // de sélectionner le secteur manuellement dans le formulaire embedded pour conformité KYC
          product_description: 'Location de logements de courte durée via la plateforme Baytup',
          support_email: 'contact@baytup.fr',
          support_phone: '+33184604000' // Numéro de support Baytup (optionnel)
        },
        metadata: {
          userId: user._id.toString(),
          platform: 'baytup'
        }
      });

      console.log(`[StripeConnect] ✅ Created connected account: ${account.id} for user ${user._id}`);
      console.log(`[StripeConnect] 📊 MCC Code set to: ${account.business_profile?.mcc || 'NOT SET'}`);
      console.log(`[StripeConnect] 📋 Business type: ${account.business_type}`);

      return {
        accountId: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted
      };
    } catch (error) {
      console.error('[StripeConnect] Error creating connected account:', error.message);
      throw error;
    }
  }

  /**
   * Create an Account Link for onboarding (redirect flow)
   * @param {String} accountId - Stripe Connected Account ID
   * @param {String} refreshUrl - URL to redirect if link expires
   * @param {String} returnUrl - URL to redirect after completion
   * @returns {Promise<Object>} - Account Link with URL
   */
  async createAccountLink(accountId, refreshUrl, returnUrl) {
    try {
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding'
      });

      return {
        url: accountLink.url,
        expiresAt: new Date(accountLink.expires_at * 1000)
      };
    } catch (error) {
      console.error('[StripeConnect] Error creating account link:', error.message);
      throw error;
    }
  }

  /**
   * Create an Account Session for embedded onboarding
   * @param {String} accountId - Stripe Connected Account ID
   * @returns {Promise<Object>} - Account Session with client secret
   */
  async createAccountSession(accountId) {
    try {
      const accountSession = await stripe.accountSessions.create({
        account: accountId,
        components: {
          account_onboarding: { enabled: true },
          payments: { enabled: true },
          payouts: { enabled: true }
        }
      });

      return {
        clientSecret: accountSession.client_secret
      };
    } catch (error) {
      console.error('[StripeConnect] Error creating account session:', error.message);
      throw error;
    }
  }

  /**
   * Update a Connected Account with pre-filled data
   * @param {String} accountId - Stripe Connected Account ID
   * @param {Object} user - User object
   * @returns {Promise<Object>} - Updated account
   */
  async updateConnectedAccount(accountId, user) {
    try {
      const account = await stripe.accounts.update(accountId, {
        business_profile: {
          name: `${user.firstName} ${user.lastName}`,
          url: `https://baytup.fr/host/${user._id}`,
          mcc: '7011',
          product_description: 'Location de logements de courte durée via la plateforme Baytup',
          support_email: 'contact@baytup.fr',
          support_phone: '+33184604000'
        }
      });

      console.log(`[StripeConnect] ✅ Updated connected account: ${account.id} for user ${user._id}`);
      console.log(`[StripeConnect] 📊 MCC Code set to: ${account.business_profile?.mcc || 'NOT SET'}`);

      return {
        accountId: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted
      };
    } catch (error) {
      console.error('[StripeConnect] Error updating connected account:', error.message);
      throw error;
    }
  }

  /**
   * Retrieve a Connected Account
   * @param {String} accountId - Stripe Connected Account ID
   * @returns {Promise<Object>} - Account details
   */
  async getConnectedAccount(accountId) {
    try {
      const account = await stripe.accounts.retrieve(accountId);

      return {
        id: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        requirements: account.requirements,
        capabilities: account.capabilities,
        defaultCurrency: account.default_currency,
        email: account.email
      };
    } catch (error) {
      console.error('[StripeConnect] Error retrieving connected account:', error.message);
      throw error;
    }
  }

  /**
   * Create a Transfer to a Connected Account
   * @param {Object} transferData - Transfer details
   * @returns {Promise<Object>} - Transfer details
   */
  async createTransfer(transferData) {
    const {
      amount,
      currency = 'eur',
      destinationAccountId,
      bookingId,
      escrowId,
      description = 'Paiement Baytup'
    } = transferData;

    try {
      const amountInCents = Math.round(amount * 100);

      const transfer = await stripe.transfers.create({
        amount: amountInCents,
        currency: currency.toLowerCase(),
        destination: destinationAccountId,
        description: description,
        metadata: {
          bookingId: bookingId?.toString(),
          escrowId: escrowId?.toString(),
          platform: 'baytup'
        },
        transfer_group: bookingId ? `booking_${bookingId}` : undefined
      }, {
        // Idempotency key prevents double transfers on retry (P0 #4)
        idempotencyKey: `transfer_${bookingId || escrowId || Date.now()}_${amountInCents}`
      });

      console.log(`[StripeConnect] Created transfer: ${transfer.id} - ${amount} ${currency} to ${destinationAccountId}`);

      return {
        transferId: transfer.id,
        amount: transfer.amount / 100,
        currency: transfer.currency.toUpperCase(),
        destinationAccountId: transfer.destination,
        status: 'succeeded'
      };
    } catch (error) {
      console.error('[StripeConnect] Error creating transfer:', error.message);
      throw error;
    }
  }

  /**
   * Retrieve a Transfer
   * @param {String} transferId - Stripe Transfer ID
   * @returns {Promise<Object>} - Transfer details
   */
  async getTransfer(transferId) {
    try {
      const transfer = await stripe.transfers.retrieve(transferId);

      return {
        id: transfer.id,
        amount: transfer.amount / 100,
        currency: transfer.currency.toUpperCase(),
        destination: transfer.destination,
        created: new Date(transfer.created * 1000),
        reversed: transfer.reversed,
        metadata: transfer.metadata
      };
    } catch (error) {
      console.error('[StripeConnect] Error retrieving transfer:', error.message);
      throw error;
    }
  }

  /**
   * Reverse a Transfer (for refunds/disputes)
   * @param {String} transferId - Stripe Transfer ID
   * @param {Number} amount - Amount to reverse (null for full reversal)
   * @returns {Promise<Object>} - Reversal details
   */
  async reverseTransfer(transferId, amount = null) {
    try {
      const reversalData = {};
      if (amount !== null) {
        reversalData.amount = Math.round(amount * 100);
      }

      const reversal = await stripe.transfers.createReversal(transferId, reversalData);

      console.log(`[StripeConnect] Reversed transfer: ${transferId}`);

      return {
        reversalId: reversal.id,
        amount: reversal.amount / 100,
        transferId: reversal.transfer
      };
    } catch (error) {
      console.error('[StripeConnect] Error reversing transfer:', error.message);
      throw error;
    }
  }

  /**
   * Get account balance (platform balance)
   * @returns {Promise<Object>} - Balance details
   */
  async getPlatformBalance() {
    try {
      const balance = await stripe.balance.retrieve();

      return {
        available: balance.available.map(b => ({
          amount: b.amount / 100,
          currency: b.currency.toUpperCase()
        })),
        pending: balance.pending.map(b => ({
          amount: b.amount / 100,
          currency: b.currency.toUpperCase()
        }))
      };
    } catch (error) {
      console.error('[StripeConnect] Error retrieving platform balance:', error.message);
      throw error;
    }
  }

  /**
   * Create a login link for connected account dashboard
   * @param {String} accountId - Stripe Connected Account ID
   * @returns {Promise<Object>} - Login link
   */
  async createLoginLink(accountId) {
    try {
      const loginLink = await stripe.accounts.createLoginLink(accountId);

      return {
        url: loginLink.url
      };
    } catch (error) {
      console.error('[StripeConnect] Error creating login link:', error.message);
      throw error;
    }
  }

  /**
   * Calculate commission split
   * Baytup Fee Structure: 8% guest service fee + 3% host commission = 11% total
   * @param {Number} totalAmount - Total booking amount
   * @param {Number} commissionRate - Commission rate (default 0.11 = 11%)
   * @returns {Object} - Split amounts
   */
  calculateSplit(totalAmount, commissionRate = 0.11) {
    const platformFee = Math.round(totalAmount * commissionRate * 100) / 100;
    const hostAmount = Math.round((totalAmount - platformFee) * 100) / 100;

    return {
      totalAmount,
      platformFee,
      hostAmount,
      commissionRate,
      commissionPercentage: `${(commissionRate * 100).toFixed(0)}%`
    };
  }
}

module.exports = new StripeService();
