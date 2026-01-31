const mongoose = require('mongoose');

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
      'review',
      'review_created',
      'review_received',
      'review_response',
      'review_reminder',
      'message',
      'message_received',
      'conversation_created',
      'wishlist_listing_added',
      'wishlist_price_drop',
      'wishlist_listing_unavailable',
      'payout_request',
      'payout_approved',
      'payout_processing',
      'payout_completed',
      'payout_rejected',
      'payout_cancelled',
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
      'account_password_reset',
      'system',
      'auth_login',
      'auth_register',
      'auth_forgot_password',
      'auth_reset_password',
      'auth_verify_email',
      'auth_welcome',
      'booking_updated',
      'review_updated',
      'review_deleted',
      'review_flagged',
      'conversation_deleted_by_admin',
      'payout_cancelled',
      'user_created_by_admin',
      'user_profile_updated_by_admin',
      'email_verified_by_admin',
      'payment_confirmed_by_host',
      // ✅ NEW: Host response deadline notifications
      'host_response_reminder',
      'host_response_urgent',
      'booking_expired',
      'booking_expired_host',
      'booking_started',
      // ✅ NEW: Stripe Connect notifications
      'stripe_onboarding_required',
      'stripe_onboarding_completed',
      'stripe_account_restricted',
      'stripe_account_disconnected'
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
