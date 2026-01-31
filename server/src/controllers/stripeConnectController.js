/**
 * Stripe Connect Controller
 * Handles host onboarding and payout management via Stripe Connect
 */

const User = require('../models/User');
const stripeService = require('../services/stripeService');

/**
 * @desc    Create or get Stripe Connected Account for host
 * @route   POST /api/stripe-connect/create-account
 * @access  Private (hosts only)
 */
const createConnectedAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Utilisateur non trouvé'
      });
    }

    // Check if user is a host
    if (user.role !== 'host' && !user.hostInfo?.isHost) {
      return res.status(403).json({
        status: 'error',
        message: 'Seuls les hôtes peuvent configurer les paiements Stripe'
      });
    }

    // Check if already has a connected account
    if (user.stripeConnect?.accountId) {
      // ✅ Update existing account with latest pre-filled data
      const account = await stripeService.updateConnectedAccount(
        user.stripeConnect.accountId,
        user
      );

      return res.status(200).json({
        status: 'success',
        message: 'Compte Stripe mis à jour avec les dernières informations',
        data: {
          accountId: user.stripeConnect.accountId,
          onboardingStatus: user.stripeConnect.onboardingStatus,
          chargesEnabled: account.chargesEnabled,
          payoutsEnabled: account.payoutsEnabled,
          detailsSubmitted: account.detailsSubmitted
        }
      });
    }

    // Create new connected account
    const account = await stripeService.createConnectedAccount(user);

    // Update user with Stripe Connect info
    user.stripeConnect = {
      accountId: account.accountId,
      onboardingStatus: 'pending',
      chargesEnabled: account.chargesEnabled,
      payoutsEnabled: account.payoutsEnabled,
      detailsSubmitted: account.detailsSubmitted,
      accountType: 'express'
    };

    await user.save();

    res.status(201).json({
      status: 'success',
      message: 'Compte Stripe Connect créé',
      data: {
        accountId: account.accountId,
        onboardingStatus: 'pending'
      }
    });
  } catch (error) {
    console.error('Error creating connected account:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la création du compte Stripe',
      error: error.message
    });
  }
};

/**
 * @desc    Get account link for onboarding (redirect flow)
 * @route   POST /api/stripe-connect/account-link
 * @access  Private (hosts only)
 */
const createAccountLink = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user?.stripeConnect?.accountId) {
      return res.status(400).json({
        status: 'error',
        message: 'Aucun compte Stripe Connect. Créez-en un d\'abord.'
      });
    }

    const { refreshUrl, returnUrl } = req.body;

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const defaultRefreshUrl = `${baseUrl}/dashboard/host/paiements?refresh=true`;
    const defaultReturnUrl = `${baseUrl}/dashboard/host/paiements?onboarding=complete`;

    const accountLink = await stripeService.createAccountLink(
      user.stripeConnect.accountId,
      refreshUrl || defaultRefreshUrl,
      returnUrl || defaultReturnUrl
    );

    res.status(200).json({
      status: 'success',
      data: {
        url: accountLink.url,
        expiresAt: accountLink.expiresAt
      }
    });
  } catch (error) {
    console.error('Error creating account link:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la création du lien d\'onboarding',
      error: error.message
    });
  }
};

/**
 * @desc    Get account session for embedded onboarding
 * @route   POST /api/stripe-connect/account-session
 * @access  Private (hosts only)
 */
const createAccountSession = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user?.stripeConnect?.accountId) {
      return res.status(400).json({
        status: 'error',
        message: 'Aucun compte Stripe Connect. Créez-en un d\'abord.'
      });
    }

    const accountSession = await stripeService.createAccountSession(
      user.stripeConnect.accountId
    );

    res.status(200).json({
      status: 'success',
      data: {
        clientSecret: accountSession.clientSecret,
        publishableKey: stripeService.getPublishableKey()
      }
    });
  } catch (error) {
    console.error('Error creating account session:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la création de la session d\'onboarding',
      error: error.message
    });
  }
};

/**
 * @desc    Get Stripe Connect account status
 * @route   GET /api/stripe-connect/status
 * @access  Private (hosts only)
 */
const getAccountStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user?.stripeConnect?.accountId) {
      return res.status(200).json({
        status: 'success',
        data: {
          hasAccount: false,
          onboardingStatus: 'not_started',
          chargesEnabled: false,
          payoutsEnabled: false
        }
      });
    }

    // Get fresh data from Stripe
    const account = await stripeService.getConnectedAccount(user.stripeConnect.accountId);

    // Determine onboarding status
    let onboardingStatus = 'pending';
    if (account.chargesEnabled && account.payoutsEnabled && account.detailsSubmitted) {
      onboardingStatus = 'completed';
    } else if (account.requirements?.currently_due?.length > 0) {
      onboardingStatus = 'restricted';
    }

    // Update user if status changed
    if (user.stripeConnect.onboardingStatus !== onboardingStatus ||
        user.stripeConnect.chargesEnabled !== account.chargesEnabled ||
        user.stripeConnect.payoutsEnabled !== account.payoutsEnabled) {

      user.stripeConnect.onboardingStatus = onboardingStatus;
      user.stripeConnect.chargesEnabled = account.chargesEnabled;
      user.stripeConnect.payoutsEnabled = account.payoutsEnabled;
      user.stripeConnect.detailsSubmitted = account.detailsSubmitted;
      user.stripeConnect.lastWebhookUpdate = new Date();

      if (onboardingStatus === 'completed' && !user.stripeConnect.onboardingCompletedAt) {
        user.stripeConnect.onboardingCompletedAt = new Date();
      }

      await user.save();
    }

    res.status(200).json({
      status: 'success',
      data: {
        hasAccount: true,
        accountId: user.stripeConnect.accountId,
        onboardingStatus,
        chargesEnabled: account.chargesEnabled,
        payoutsEnabled: account.payoutsEnabled,
        detailsSubmitted: account.detailsSubmitted,
        requirements: account.requirements,
        defaultCurrency: account.defaultCurrency
      }
    });
  } catch (error) {
    console.error('Error getting account status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération du statut',
      error: error.message
    });
  }
};

/**
 * @desc    Get Stripe Dashboard login link for connected account
 * @route   GET /api/stripe-connect/dashboard-link
 * @access  Private (hosts only)
 */
const getDashboardLink = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user?.stripeConnect?.accountId) {
      return res.status(400).json({
        status: 'error',
        message: 'Aucun compte Stripe Connect configuré'
      });
    }

    const loginLink = await stripeService.createLoginLink(user.stripeConnect.accountId);

    res.status(200).json({
      status: 'success',
      data: {
        url: loginLink.url
      }
    });
  } catch (error) {
    console.error('Error creating dashboard link:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la création du lien dashboard',
      error: error.message
    });
  }
};

/**
 * @desc    Handle Stripe Connect webhooks
 * @route   POST /api/webhooks/stripe-connect
 * @access  Public (Stripe only)
 */
const handleConnectWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];

  try {
    const event = stripeService.verifyWebhookSignature(req.body, sig);

    console.log(`[StripeConnect Webhook] Event: ${event.type}`);

    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object;

        // Find user by connected account ID
        const user = await User.findOne({ 'stripeConnect.accountId': account.id });

        if (user) {
          let onboardingStatus = 'pending';
          if (account.charges_enabled && account.payouts_enabled && account.details_submitted) {
            onboardingStatus = 'completed';
          } else if (account.requirements?.currently_due?.length > 0) {
            onboardingStatus = 'restricted';
          }

          user.stripeConnect.onboardingStatus = onboardingStatus;
          user.stripeConnect.chargesEnabled = account.charges_enabled;
          user.stripeConnect.payoutsEnabled = account.payouts_enabled;
          user.stripeConnect.detailsSubmitted = account.details_submitted;
          user.stripeConnect.lastWebhookUpdate = new Date();
          user.stripeConnect.requirementsPending = account.requirements?.currently_due || [];

          if (onboardingStatus === 'completed' && !user.stripeConnect.onboardingCompletedAt) {
            user.stripeConnect.onboardingCompletedAt = new Date();
          }

          await user.save();
          console.log(`[StripeConnect Webhook] Updated user ${user._id} - status: ${onboardingStatus}`);
        }
        break;
      }

      case 'account.application.deauthorized': {
        const account = event.data.object;
        const user = await User.findOne({ 'stripeConnect.accountId': account.id });

        if (user) {
          user.stripeConnect.onboardingStatus = 'not_started';
          user.stripeConnect.chargesEnabled = false;
          user.stripeConnect.payoutsEnabled = false;
          user.stripeConnect.accountId = null;
          await user.save();
          console.log(`[StripeConnect Webhook] User ${user._id} disconnected Stripe`);
        }
        break;
      }

      case 'transfer.created':
      case 'transfer.reversed':
      case 'transfer.updated': {
        // Log transfer events for debugging
        const transfer = event.data.object;
        console.log(`[StripeConnect Webhook] Transfer ${event.type}: ${transfer.id} - ${transfer.amount / 100} ${transfer.currency}`);
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('[StripeConnect Webhook] Error:', error.message);
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  createConnectedAccount,
  createAccountLink,
  createAccountSession,
  getAccountStatus,
  getDashboardLink,
  handleConnectWebhook
};
