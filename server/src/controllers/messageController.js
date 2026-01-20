const { Conversation, Message } = require('../models/Message');
const User = require('../models/User');
const Listing = require('../models/Listing');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');

// @desc    Get all conversations for logged-in user
// @route   GET /api/messages/conversations
// @access  Private
const getConversations = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { status = 'active', page = 1, limit = 20 } = req.query;

  // Build query
  const query = {
    'participants.user': userId
  };

  if (status) {
    query.status = status;
  }

  // Get conversations with pagination
  const skip = (page - 1) * limit;
  const conversations = await Conversation.find(query)
    .populate('participants.user', 'firstName lastName avatar role')
    .populate('listing', 'title category images address')
    .populate('booking', 'startDate endDate status')
    .populate('lastMessage.sender', 'firstName lastName avatar')
    .sort('-lastMessage.sentAt -updatedAt')
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  const total = await Conversation.countDocuments(query);

  // Calculate unread count for each conversation
  const conversationsWithUnread = await Promise.all(
    conversations.map(async (conv) => {
      const participant = conv.participants.find(
        (p) => p.user._id.toString() === userId
      );

      if (!participant) {
        return { ...conv, unreadCount: 0 };
      }

      // Count unread messages
      const unreadCount = await Message.countDocuments({
        conversation: conv._id,
        sender: { $ne: userId },
        createdAt: { $gt: participant.lastReadAt }
      });

      // Get other participant
      const otherParticipant = conv.participants.find(
        (p) => p.user._id.toString() !== userId
      );

      return {
        ...conv,
        unreadCount,
        otherUser: otherParticipant?.user || null
      };
    })
  );

  res.status(200).json({
    status: 'success',
    results: conversationsWithUnread.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    },
    data: {
      conversations: conversationsWithUnread
    }
  });
});

// @desc    Get single conversation with messages
// @route   GET /api/messages/conversations/:id
// @access  Private
const getConversation = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const conversationId = req.params.id;

  // Get conversation
  const conversation = await Conversation.findById(conversationId)
    .populate('participants.user', 'firstName lastName avatar role')
    .populate('listing', 'title category images address pricing')
    .populate('booking', 'startDate endDate status pricing');

  if (!conversation) {
    return next(new AppError('Conversation not found', 404));
  }

  // Check if user is participant
  const isParticipant = conversation.participants.some(
    (p) => p.user._id.toString() === userId
  );

  if (!isParticipant) {
    return next(new AppError('You are not authorized to view this conversation', 403));
  }

  // Get messages
  const { page = 1, limit = 50 } = req.query;
  const skip = (page - 1) * limit;

  const messages = await Message.find({ conversation: conversationId })
    .populate('sender', 'firstName lastName avatar role')
    .populate('readBy.user', 'firstName lastName')
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  const totalMessages = await Message.countDocuments({ conversation: conversationId });

  // Mark conversation as read
  await conversation.markAsRead(userId);

  // Get other participant
  const otherParticipant = conversation.participants.find(
    (p) => p.user._id.toString() !== userId
  );

  res.status(200).json({
    status: 'success',
    results: messages.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: totalMessages,
      pages: Math.ceil(totalMessages / limit)
    },
    data: {
      conversation: {
        ...conversation.toObject(),
        otherUser: otherParticipant?.user || null
      },
      messages: messages.reverse() // Reverse to show oldest first
    }
  });
});

// @desc    Create or get conversation
// @route   POST /api/messages/conversations
// @access  Private
const createConversation = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { recipientId, listingId, bookingId, subject, type } = req.body;

  if (!recipientId) {
    return next(new AppError('Recipient ID is required', 400));
  }

  // Check if recipient exists
  const recipient = await User.findById(recipientId);
  if (!recipient) {
    return next(new AppError('Recipient not found', 404));
  }

  // Check if conversation already exists
  let conversation = await Conversation.findOne({
    $and: [
      { 'participants.user': userId },
      { 'participants.user': recipientId }
    ],
    ...(listingId && { listing: listingId }),
    ...(bookingId && { booking: bookingId })
  });

  if (!conversation) {
    // Create new conversation
    conversation = await Conversation.create({
      participants: [
        { user: userId },
        { user: recipientId }
      ],
      ...(listingId && { listing: listingId }),
      ...(bookingId && { booking: bookingId }),
      type: type || (listingId ? 'inquiry' : bookingId ? 'booking' : 'general'),
      subject
    });

    await conversation.populate([
      { path: 'participants.user', select: 'firstName lastName avatar role' },
      { path: 'listing', select: 'title category images address' },
      { path: 'booking', select: 'startDate endDate status' }
    ]);
  } else {
    await conversation.populate([
      { path: 'participants.user', select: 'firstName lastName avatar role' },
      { path: 'listing', select: 'title category images address' },
      { path: 'booking', select: 'startDate endDate status' }
    ]);
  }

  // Get other participant
  const otherParticipant = conversation.participants.find(
    (p) => p.user._id.toString() !== userId
  );

  res.status(201).json({
    status: 'success',
    data: {
      conversation: {
        ...conversation.toObject(),
        otherUser: otherParticipant?.user || null
      }
    }
  });
});

// @desc    Send message
// @route   POST /api/messages
// @access  Private
const sendMessage = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { conversationId, content, type = 'text', attachments } = req.body;

  if (!conversationId || !content) {
    return next(new AppError('Conversation ID and content are required', 400));
  }

  // Get conversation
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    return next(new AppError('Conversation not found', 404));
  }

  // Check if user is participant
  const isParticipant = conversation.participants.some(
    (p) => p.user.toString() === userId
  );

  if (!isParticipant) {
    return next(new AppError('You are not authorized to send messages in this conversation', 403));
  }

  // Create message
  const message = await Message.create({
    conversation: conversationId,
    sender: userId,
    content,
    type,
    attachments: attachments || []
  });

  await message.populate('sender', 'firstName lastName avatar role');

  // Get recipient information and create notification
  const recipientIds = conversation.participants
    .filter(p => p.user.toString() !== userId)
    .map(p => p.user.toString());

  // Create notification for message recipients
  try {
    const sender = await User.findById(userId).select('firstName lastName');
    const listing = conversation.listing ? await conversation.populate('listing', 'title') : null;

    for (const recipientId of recipientIds) {
      await Notification.createNotification({
        recipient: recipientId,
        sender: userId,
        type: 'message_received',
        title: 'New Message! 💬',
        message: `${sender.firstName} ${sender.lastName} sent you a message${listing?.listing ? ` about "${listing.listing.title}"` : ''}.`,
        data: {
          conversationId,
          messageId: message._id,
          senderName: `${sender.firstName} ${sender.lastName}`,
          messagePreview: content.substring(0, 100),
          listingTitle: listing?.listing?.title
        },
        link: `/dashboard/messages/${conversationId}`,
        priority: 'normal'
      });
    }
  } catch (notificationError) {
    console.error('Error creating message notification:', notificationError);
  }

  // Emit socket event for real-time messaging
  if (req.io) {
    recipientIds.forEach(recipientId => {
      req.io.to(`user_${recipientId}`).emit('new_message', {
        conversationId,
        message: message.toObject()
      });
    });
  }

  res.status(201).json({
    status: 'success',
    data: {
      message
    }
  });
});

// @desc    Update message
// @route   PUT /api/messages/:id
// @access  Private
const updateMessage = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const messageId = req.params.id;
  const { content } = req.body;

  if (!content) {
    return next(new AppError('Content is required', 400));
  }

  // Get message
  let message = await Message.findById(messageId);
  if (!message) {
    return next(new AppError('Message not found', 404));
  }

  // Check if user is sender
  if (message.sender.toString() !== userId) {
    return next(new AppError('You can only edit your own messages', 403));
  }

  // Check if message is not too old (e.g., 15 minutes)
  const fifteenMinutes = 15 * 60 * 1000;
  const messageAge = Date.now() - message.createdAt.getTime();

  if (messageAge > fifteenMinutes) {
    return next(new AppError('Cannot edit messages older than 15 minutes', 400));
  }

  // Update message
  message.originalContent = message.content;
  message.content = content;
  message.edited = true;
  message.editedAt = new Date();

  await message.save();
  await message.populate('sender', 'firstName lastName avatar role');

  // Emit socket event
  if (req.io) {
    const conversation = await Conversation.findById(message.conversation);
    const recipientIds = conversation.participants
      .filter(p => p.user.toString() !== userId)
      .map(p => p.user.toString());

    recipientIds.forEach(recipientId => {
      req.io.to(`user_${recipientId}`).emit('message_updated', {
        conversationId: message.conversation,
        message: message.toObject()
      });
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      message
    }
  });
});

// @desc    Delete message
// @route   DELETE /api/messages/:id
// @access  Private
const deleteMessage = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const messageId = req.params.id;

  // Get message
  const message = await Message.findById(messageId);
  if (!message) {
    return next(new AppError('Message not found', 404));
  }

  // Check if user is sender
  if (message.sender.toString() !== userId) {
    return next(new AppError('You can only delete your own messages', 403));
  }

  const conversationId = message.conversation;

  // Delete message
  await message.deleteOne();

  // Update conversation message count
  await Conversation.findByIdAndUpdate(conversationId, {
    $inc: { messageCount: -1 }
  });

  // Emit socket event
  if (req.io) {
    const conversation = await Conversation.findById(conversationId);
    const recipientIds = conversation.participants
      .filter(p => p.user.toString() !== userId)
      .map(p => p.user.toString());

    recipientIds.forEach(recipientId => {
      req.io.to(`user_${recipientId}`).emit('message_deleted', {
        conversationId,
        messageId
      });
    });
  }

  res.status(200).json({
    status: 'success',
    message: 'Message deleted successfully'
  });
});

// @desc    Mark conversation as read
// @route   PUT /api/messages/conversations/:id/read
// @access  Private
const markAsRead = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const conversationId = req.params.id;

  // Get conversation
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    return next(new AppError('Conversation not found', 404));
  }

  // Check if user is participant
  const isParticipant = conversation.participants.some(
    (p) => p.user.toString() === userId
  );

  if (!isParticipant) {
    return next(new AppError('You are not authorized to access this conversation', 403));
  }

  // Mark as read
  await conversation.markAsRead(userId);

  res.status(200).json({
    status: 'success',
    message: 'Conversation marked as read'
  });
});

// @desc    Archive conversation
// @route   PUT /api/messages/conversations/:id/archive
// @access  Private
const archiveConversation = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const conversationId = req.params.id;

  // Get conversation
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    return next(new AppError('Conversation not found', 404));
  }

  // Check if user is participant
  const isParticipant = conversation.participants.some(
    (p) => p.user.toString() === userId
  );

  if (!isParticipant) {
    return next(new AppError('You are not authorized to archive this conversation', 403));
  }

  // Update conversation status
  conversation.status = 'archived';
  await conversation.save();

  res.status(200).json({
    status: 'success',
    message: 'Conversation archived successfully'
  });
});

// @desc    Unarchive conversation
// @route   PUT /api/messages/conversations/:id/unarchive
// @access  Private
const unarchiveConversation = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const conversationId = req.params.id;

  // Get conversation
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    return next(new AppError('Conversation not found', 404));
  }

  // Check if user is participant
  const isParticipant = conversation.participants.some(
    (p) => p.user.toString() === userId
  );

  if (!isParticipant) {
    return next(new AppError('You are not authorized to unarchive this conversation', 403));
  }

  // Update conversation status
  conversation.status = 'active';
  await conversation.save();

  res.status(200).json({
    status: 'success',
    message: 'Conversation unarchived successfully'
  });
});

// @desc    Delete conversation
// @route   DELETE /api/messages/conversations/:id
// @access  Private
const deleteConversation = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const conversationId = req.params.id;

  // Get conversation
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    return next(new AppError('Conversation not found', 404));
  }

  // Check if user is participant
  const isParticipant = conversation.participants.some(
    (p) => p.user.toString() === userId
  );

  if (!isParticipant) {
    return next(new AppError('You are not authorized to delete this conversation', 403));
  }

  // Delete all messages in conversation
  await Message.deleteMany({ conversation: conversationId });

  // Delete conversation
  await conversation.deleteOne();

  res.status(200).json({
    status: 'success',
    message: 'Conversation deleted successfully'
  });
});

// @desc    Get message statistics
// @route   GET /api/messages/stats
// @access  Private
const getMessageStats = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  // Get total conversations
  const totalConversations = await Conversation.countDocuments({
    'participants.user': userId,
    status: 'active'
  });

  // Get archived conversations
  const archivedConversations = await Conversation.countDocuments({
    'participants.user': userId,
    status: 'archived'
  });

  // Get total unread messages
  const conversations = await Conversation.find({
    'participants.user': userId,
    status: 'active'
  }).lean();

  let totalUnread = 0;
  for (const conv of conversations) {
    const participant = conv.participants.find(
      (p) => p.user.toString() === userId
    );
    if (participant) {
      const unreadCount = await Message.countDocuments({
        conversation: conv._id,
        sender: { $ne: userId },
        createdAt: { $gt: participant.lastReadAt }
      });
      totalUnread += unreadCount;
    }
  }

  // Get recent activity
  const recentMessages = await Message.find({
    sender: userId
  })
    .sort('-createdAt')
    .limit(5)
    .lean();

  res.status(200).json({
    status: 'success',
    data: {
      summary: {
        totalConversations,
        archivedConversations,
        totalUnread,
        activeConversations: totalConversations - archivedConversations
      },
      recentActivity: recentMessages
    }
  });
});

// @desc    Search messages
// @route   GET /api/messages/search
// @access  Private
const searchMessages = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { query, page = 1, limit = 20 } = req.query;

  if (!query) {
    return next(new AppError('Search query is required', 400));
  }

  // Get user's conversations
  const userConversations = await Conversation.find({
    'participants.user': userId
  }).select('_id');

  const conversationIds = userConversations.map(c => c._id);

  // Search messages
  const skip = (page - 1) * limit;
  const messages = await Message.find({
    conversation: { $in: conversationIds },
    content: { $regex: query, $options: 'i' }
  })
    .populate('sender', 'firstName lastName avatar')
    .populate('conversation')
    .sort('-createdAt')
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  const total = await Message.countDocuments({
    conversation: { $in: conversationIds },
    content: { $regex: query, $options: 'i' }
  });

  res.status(200).json({
    status: 'success',
    results: messages.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    },
    data: {
      messages
    }
  });
});

// @desc    Admin: Get all conversations across platform
// @route   GET /api/messages/admin/conversations
// @access  Private/Admin
const getAllConversationsAdmin = catchAsync(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(new AppError('Access denied. Admin only.', 403));
  }

  const { status, search, page = 1, limit = 20, sort = '-updatedAt' } = req.query;

  // Build query
  const query = {};
  if (status) {
    query.status = status;
  }

  // Search by user names, listing title, or message content
  if (search) {
    const users = await User.find({
      $or: [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }).select('_id');

    const listings = await Listing.find({
      title: { $regex: search, $options: 'i' }
    }).select('_id');

    query.$or = [
      { 'participants.user': { $in: users.map(u => u._id) } },
      { listing: { $in: listings.map(l => l._id) } }
    ];
  }

  // Get conversations with pagination
  const skip = (page - 1) * limit;
  const conversations = await Conversation.find(query)
    .populate('participants.user', 'firstName lastName avatar email role')
    .populate('listing', 'title category images address')
    .populate('booking', 'startDate endDate status')
    .populate('lastMessage.sender', 'firstName lastName avatar')
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  const total = await Conversation.countDocuments(query);

  // Calculate unread count for each conversation
  const conversationsWithDetails = await Promise.all(
    conversations.map(async (conv) => {
      // Count total messages
      const messageCount = await Message.countDocuments({
        conversation: conv._id
      });

      return {
        ...conv,
        messageCount
      };
    })
  );

  // Get statistics
  const stats = {
    total: await Conversation.countDocuments(),
    active: await Conversation.countDocuments({ status: 'active' }),
    archived: await Conversation.countDocuments({ status: 'archived' }),
    totalMessages: await Message.countDocuments()
  };

  res.status(200).json({
    status: 'success',
    results: conversationsWithDetails.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    },
    stats,
    data: {
      conversations: conversationsWithDetails
    }
  });
});

// @desc    Admin: Get single conversation with all messages
// @route   GET /api/messages/admin/conversations/:id
// @access  Private/Admin
const getConversationAdmin = catchAsync(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(new AppError('Access denied. Admin only.', 403));
  }

  const conversationId = req.params.id;

  // Get conversation
  const conversation = await Conversation.findById(conversationId)
    .populate('participants.user', 'firstName lastName avatar email phone role')
    .populate('listing', 'title category images address pricing')
    .populate('booking', 'startDate endDate status pricing');

  if (!conversation) {
    return next(new AppError('Conversation not found', 404));
  }

  // Get all messages
  const messages = await Message.find({ conversation: conversationId })
    .populate('sender', 'firstName lastName avatar email role')
    .sort('createdAt');

  res.status(200).json({
    status: 'success',
    data: {
      conversation,
      messages
    }
  });
});

// @desc    Admin: Get message statistics
// @route   GET /api/messages/admin/stats
// @access  Private/Admin
const getMessageStatsAdmin = catchAsync(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(new AppError('Access denied. Admin only.', 403));
  }

  // Get conversation statistics
  const totalConversations = await Conversation.countDocuments();
  const activeConversations = await Conversation.countDocuments({ status: 'active' });
  const archivedConversations = await Conversation.countDocuments({ status: 'archived' });

  // Get message statistics
  const totalMessages = await Message.countDocuments();

  // Get recent activity (last 10 conversations updated)
  const recentConversations = await Conversation.find()
    .populate('participants.user', 'firstName lastName avatar')
    .populate('listing', 'title')
    .sort('-updatedAt')
    .limit(10)
    .lean();

  // Get messages per day for last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const messagesPerDay = await Message.aggregate([
    {
      $match: {
        createdAt: { $gte: sevenDaysAgo }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      summary: {
        totalConversations,
        activeConversations,
        archivedConversations,
        totalMessages
      },
      recentActivity: recentConversations,
      messagesPerDay
    }
  });
});

// @desc    Admin: Delete any conversation
// @route   DELETE /api/messages/admin/conversations/:id
// @access  Private/Admin
const deleteConversationAdmin = catchAsync(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(new AppError('Access denied. Admin only.', 403));
  }

  const conversationId = req.params.id;

  const conversation = await Conversation.findById(conversationId);

  if (!conversation) {
    return next(new AppError('Conversation not found', 404));
  }

  // Delete all messages in conversation
  await Message.deleteMany({ conversation: conversationId });

  // Delete conversation
  await conversation.deleteOne();

  res.status(200).json({
    status: 'success',
    message: 'Conversation deleted successfully'
  });
});

module.exports = {
  getConversations,
  getConversation,
  createConversation,
  sendMessage,
  updateMessage,
  deleteMessage,
  markAsRead,
  archiveConversation,
  unarchiveConversation,
  deleteConversation,
  getMessageStats,
  searchMessages,
  getAllConversationsAdmin,
  getConversationAdmin,
  getMessageStatsAdmin,
  deleteConversationAdmin
};
