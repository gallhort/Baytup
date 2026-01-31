const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  // Participants
  participants: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    lastReadAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Related listing (if conversation is about a specific listing)
  listing: {
    type: mongoose.Schema.ObjectId,
    ref: 'Listing'
  },

  // Related booking (if conversation is about a specific booking)
  booking: {
    type: mongoose.Schema.ObjectId,
    ref: 'Booking'
  },

  // Conversation metadata
  type: {
    type: String,
    enum: ['inquiry', 'booking', 'support', 'general'],
    default: 'general'
  },

  subject: {
    type: String,
    maxLength: [200, 'Subject cannot exceed 200 characters']
  },

  // Last message info for quick access
  lastMessage: {
    content: String,
    sender: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    sentAt: Date,
    type: {
      type: String,
      enum: ['text', 'image', 'file', 'system'],
      default: 'text'
    }
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'archived', 'blocked'],
    default: 'active'
  },

  // Message count
  messageCount: {
    type: Number,
    default: 0
  },

  // Priority (for support conversations)
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },

  // Tags for organization
  tags: [String]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const MessageSchema = new mongoose.Schema({
  // Conversation reference
  conversation: {
    type: mongoose.Schema.ObjectId,
    ref: 'Conversation',
    required: [true, 'Conversation is required']
  },

  // Sender
  sender: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Sender is required']
  },

  // Message content
  content: {
    type: String,
    required: [true, 'Message content is required'],
    maxLength: [2000, 'Message cannot exceed 2000 characters']
  },

  // Message type
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'system', 'booking_request', 'booking_confirmation'],
    default: 'text'
  },

  // Attachments
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'document', 'pdf']
    },
    url: String,
    filename: String,
    size: Number,
    mimeType: String
  }],

  // Read receipts
  readBy: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Message status
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'failed'],
    default: 'sent'
  },

  // Edit history
  edited: {
    type: Boolean,
    default: false
  },
  editedAt: Date,
  originalContent: String,

  // System message data (for booking requests, etc.)
  systemData: {
    bookingId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Booking'
    },
    action: String,
    metadata: mongoose.Schema.Types.Mixed
  },

  // Replies (for threaded conversations)
  replyTo: {
    type: mongoose.Schema.ObjectId,
    ref: 'Message'
  },

  // Language
  language: {
    type: String,
    enum: ['en', 'fr', 'ar'],
    default: 'en'
  },

  // Moderation
  flagged: {
    type: Boolean,
    default: false
  },
  flagReason: String,
  moderationFlags: [{
    type: String,
    enum: ['insult', 'spam', 'external_contact', 'inappropriate', 'other']
  }],
  moderationScore: {
    type: Number,
    default: 0
  },
  moderatedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for Conversation
ConversationSchema.index({ 'participants.user': 1 });
ConversationSchema.index({ listing: 1 });
ConversationSchema.index({ booking: 1 });
ConversationSchema.index({ 'lastMessage.sentAt': -1 });
ConversationSchema.index({ status: 1, updatedAt: -1 });

// Indexes for Message
MessageSchema.index({ conversation: 1, createdAt: -1 });
MessageSchema.index({ sender: 1, createdAt: -1 });
MessageSchema.index({ 'readBy.user': 1 });
MessageSchema.index({ type: 1 });

// Virtual for unread message count per user
ConversationSchema.virtual('unreadCount').get(function() {
  // This will be calculated in the controller based on user context
  return 0;
});

// Virtual for message age
MessageSchema.virtual('age').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now - this.createdAt);
  const diffMinutes = Math.ceil(diffTime / (1000 * 60));
  const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) return `${diffMinutes}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return this.createdAt.toLocaleDateString();
});

// Update conversation when new message is added
MessageSchema.post('save', async function(doc) {
  const Conversation = mongoose.model('Conversation');

  await Conversation.findByIdAndUpdate(doc.conversation, {
    $set: {
      'lastMessage.content': doc.content,
      'lastMessage.sender': doc.sender,
      'lastMessage.sentAt': doc.createdAt,
      'lastMessage.type': doc.type
    },
    $inc: { messageCount: 1 }
  });
});

// Static method to create or get conversation between two users
ConversationSchema.statics.findOrCreateConversation = async function(user1Id, user2Id, listingId = null, bookingId = null) {
  // Look for existing conversation
  let conversation = await this.findOne({
    $and: [
      { 'participants.user': user1Id },
      { 'participants.user': user2Id }
    ],
    ...(listingId && { listing: listingId }),
    ...(bookingId && { booking: bookingId })
  });

  if (!conversation) {
    // Create new conversation
    conversation = await this.create({
      participants: [
        { user: user1Id },
        { user: user2Id }
      ],
      ...(listingId && { listing: listingId }),
      ...(bookingId && { booking: bookingId }),
      type: listingId ? 'inquiry' : bookingId ? 'booking' : 'general'
    });
  }

  return conversation;
};

// Method to mark messages as read
ConversationSchema.methods.markAsRead = async function(userId) {
  const Message = mongoose.model('Message');

  // Mark all unread messages in this conversation as read by the user
  await Message.updateMany(
    {
      conversation: this._id,
      sender: { $ne: userId },
      'readBy.user': { $ne: userId }
    },
    {
      $push: {
        readBy: {
          user: userId,
          readAt: new Date()
        }
      }
    }
  );

  // Update user's last read time in conversation
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  if (participant) {
    participant.lastReadAt = new Date();
    await this.save();
  }
};

// Method to get unread count for a user
ConversationSchema.methods.getUnreadCount = async function(userId) {
  const Message = mongoose.model('Message');

  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  if (!participant) return 0;

  const unreadCount = await Message.countDocuments({
    conversation: this._id,
    sender: { $ne: userId },
    createdAt: { $gt: participant.lastReadAt }
  });

  return unreadCount;
};

// Method to add user to conversation
ConversationSchema.methods.addParticipant = function(userId) {
  const exists = this.participants.some(p => p.user.toString() === userId.toString());
  if (!exists) {
    this.participants.push({ user: userId });
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove user from conversation
ConversationSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(p => p.user.toString() !== userId.toString());
  return this.save();
};

// Create models
const Conversation = mongoose.model('Conversation', ConversationSchema);
const Message = mongoose.model('Message', MessageSchema);

module.exports = { Conversation, Message };