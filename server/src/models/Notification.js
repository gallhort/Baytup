const mongoose = require('mongoose');
const { sendNotificationEmail } = require('../utils/emailService');

const NotificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient is required'],
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: [
      'booking',
      'booking_created',
      'booking_confirmed',
      'booking_cancelled',
      'booking_cancelled_by_guest',
      'booking_cancelled_by_host',
      'booking_status_changed',
      'booking_cancelled_by_admin',
      'booking_payment_updated',
      'booking_payment_successful',
      'booking_payment_failed',
      'booking_reminder',
      'booking_check_in',
      'booking_check_out',
      'booking_completed',
      'booking_request',
      'booking_request_sent',
      'booking_approved',
      'booking_rejected',
      'booking_updated',
      'booking_expired',
      'booking_expired_host',
      'booking_started',
      'review',
      'review_created',
      'review_received',
      'review_response',
      'review_reminder',
      'review_updated',
      'review_deleted',
      'review_flagged',
      'review_revealed',
      'review_pending_pair',
      'message',
      'message_received',
      'conversation_created',
      'conversation_deleted_by_admin',
      'wishlist_listing_added',
      'wishlist_price_drop',
      'wishlist_listing_unavailable',
      'payout_request',
      'payout_approved',
      'payout_processing',
      'payout_completed',
      'payout_rejected',
      'payout_cancelled',
      'payout_delayed',
      'payout_bank_required',
      'payout_auto_created',
      'payout_pending_admin',
      'host_application',
      'host_application_submitted',
      'host_application_approved',
      'host_application_rejected',
      'host_application_resubmission',
      'listing_update',
      'listing_created',
      'listing_published',
      'listing_updated',
      'listing_approved',
      'listing_rejected',
      'listing_featured',
      'listing_deleted',
      'listing_deactivated',
      'new_booking_request',
      'earning_received',
      'user_role_changed',
      'user_blocked',
      'user_unblocked',
      'user_activated',
      'user_deactivated',
      'user_deleted',
      'user_created_by_admin',
      'user_profile_updated_by_admin',
      'account_password_reset',
      'password_changed',
      'email_changed',
      'email_verified_by_admin',
      'system',
      'auth_login',
      'auth_register',
      'auth_forgot_password',
      'auth_reset_password',
      'auth_verify_email',
      'auth_welcome',
      'payment_confirmed_by_host',
      // Host response deadline notifications
      'host_response_reminder',
      'host_response_urgent',
      // Stripe Connect notifications
      'stripe_onboarding_required',
      'stripe_onboarding_completed',
      'stripe_account_restricted',
      'stripe_account_disconnected',
      // Dispute notifications
      'dispute_opened',
      'dispute_resolved',
      // Voucher notifications
      'voucher_expired',
      'voucher_reminder_24h',
      'voucher_reminder_6h',
      // Ticket notifications
      'ticket_created',
      'ticket_reply',
      'ticket_updated',
      'ticket_resolved',
      'ticket_assigned'
    ],
    required: [true, 'Notification type is required'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    maxLength: [200, 'Title cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    maxLength: [1000, 'Message cannot exceed 1000 characters']
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  link: {
    type: String,
    maxLength: [500, 'Link cannot exceed 500 characters']
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  expiresAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for efficient queries
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Mark notification as read
NotificationSchema.methods.markAsRead = async function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    await this.save();
  }
  return this;
};

// Notification types that already have dedicated email sends in their controllers
// These are skipped to avoid sending duplicate/generic emails
const TYPES_WITH_DEDICATED_EMAIL = new Set([
  // Booking emails (bookingController)
  'booking_approved',           // sendBookingApprovedEmail
  'booking_rejected',           // sendBookingRejectedEmail
  'payment_confirmed_by_host',  // sendPaymentConfirmedByHostEmail
  'booking_cancelled_by_guest', // sendBookingCancelledEmail
  'booking_cancelled_by_host',  // sendBookingCancelledEmail
  // Auth emails (authController) - already have dedicated rich emails
  'auth_register',              // sendEmailVerification
  'auth_forgot_password',       // sendPasswordResetEmail
  'auth_verify_email',          // sendWelcomeEmail
  'auth_welcome',               // sendWelcomeEmail (same flow)
  'auth_login',                 // no email needed on every login
  // Settings emails (settingsController)
  'password_changed',           // sendPasswordChangedEmail
  'email_changed',              // sendEmailChangedEmail
  // Listing emails (listingController)
  'listing_approved',           // sendListingApprovedEmail
  'listing_rejected',           // sendListingRejectedEmail
  'listing_deleted',            // sendListingDeletedEmail
  // Host application emails (hostApplicationController)
  'host_application_submitted', // sendHostApplicationSubmitted
  'host_application_approved',  // sendHostApplicationApproved
  'host_application_rejected',  // sendHostApplicationRejected
  'host_application_resubmission', // sendHostApplicationResubmission
  // Payout emails (payoutController)
  'payout_request',             // sendPayoutRequestEmail
  'payout_completed',           // sendPayoutCompletedEmail
  'payout_rejected',            // sendPayoutRejectedEmail
  // Review emails (reviewController)
  'review_revealed',            // sendReviewReceivedEmail
]);

// Static method to create notification
NotificationSchema.statics.createNotification = async function(data) {
  try {
    const notification = await this.create(data);

    // Emit socket event if socket.io is available
    const io = global.io || (global.app && global.app.get('socketio'));
    if (io) {
      io.to(`user-${data.recipient}`).emit('new_notification', {
        notification: notification.toObject()
      });
    }

    // Auto-send email for notifications that don't have dedicated email handlers
    if (!TYPES_WITH_DEDICATED_EMAIL.has(data.type) && !data.skipEmail) {
      try {
        // Lazy require to avoid circular dependency (User.js ↔ Notification.js)
        const User = require('./User');
        const recipient = await User.findById(data.recipient).select('email firstName lastName');
        if (recipient && recipient.email) {
          // Fire and forget - don't block notification creation
          sendNotificationEmail(recipient.email, recipient.firstName, {
            title: data.title,
            message: data.message,
            link: data.link,
            priority: data.priority || 'normal'
          }).catch(err => console.error('Auto-email failed for notification:', err.message));
        }
      } catch (emailError) {
        console.error('Error in auto-email for notification:', emailError.message);
      }
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Static method to mark multiple notifications as read
NotificationSchema.statics.markAllAsRead = async function(recipientId) {
  return this.updateMany(
    { recipient: recipientId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
};

// Static method to get unread count
NotificationSchema.statics.getUnreadCount = async function(recipientId) {
  return this.countDocuments({ recipient: recipientId, isRead: false });
};

// Static method to delete old notifications
NotificationSchema.statics.deleteOldNotifications = async function(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return this.deleteMany({
    createdAt: { $lt: cutoffDate },
    isRead: true
  });
};

module.exports = mongoose.model('Notification', NotificationSchema);
