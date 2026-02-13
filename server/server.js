const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./src/config/database');
const {
  apiLimiter,
  authLimiter,
  strictLimiter,
  uploadLimiter,
  searchLimiter,
  webhookLimiter
} = require('./src/middleware/rateLimiter');
const { initBookingAutomation } = require('./src/services/bookingAutomation');
const { sanitizeInput } = require('./src/middleware/sanitize');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const server = http.createServer(app);

// Create Socket.IO instance with CORS configuration
// Restrict localhost to development only
const socketAllowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://baytup.fr', 'https://www.baytup.fr']
  : ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://baytup.fr', 'https://www.baytup.fr'];

const io = socketIo(server, {
  cors: {
    origin: socketAllowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Connect to MongoDB
// ✅ MODIFICATION: Initialize cron jobs after DB connection
connectDB().then(async () => {
  console.log('✅ MongoDB connected successfully');

  // Seed/sync default moderation rules (upsert - safe to re-run)
  try {
    const moderationService = require('./src/services/moderationService');
    await moderationService.seedDefaultRules();
    console.log('✅ Moderation rules synced successfully');
  } catch (error) {
    console.error('⚠️  Failed to seed moderation rules:', error.message);
  }

  // Initialize booking automation cron jobs
  initBookingAutomation();
}).catch(err => {
  console.error('❌ MongoDB connection failed:', err);
  console.error('Failed to initialize booking automation');
});

// Make io accessible to routes and models (Notification.createNotification uses global.io)
app.set('socketio', io);
global.io = io;

// Socket.IO authentication middleware - reject unauthenticated connections (P0 #8)
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    // Verify JWT token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const User = require('./src/models/User');
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(new Error('User not found'));
    }

    socket.user = user;
    // Rate limiting state (P0 #9)
    socket._eventCount = 0;
    socket._eventResetTime = Date.now() + 60000;
    next();
  } catch (error) {
    console.error('Socket authentication error:', error.message);
    next(new Error('Invalid token'));
  }
});

// Socket.IO rate limit helper (P0 #9)
const SOCKET_RATE_LIMIT = 100; // max events per minute
function checkSocketRateLimit(socket) {
  const now = Date.now();
  if (now > socket._eventResetTime) {
    socket._eventCount = 0;
    socket._eventResetTime = now + 60000;
  }
  socket._eventCount++;
  if (socket._eventCount > SOCKET_RATE_LIMIT) {
    socket.emit('error', { message: 'Rate limit exceeded. Please slow down.' });
    return false;
  }
  return true;
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  // Join user's personal room for private messages
  socket.join(`user-${socket.user._id}`);

  // Apply rate limiting to all incoming events (P0 #9)
  const originalOnEvent = socket.onevent;
  socket.onevent = function(packet) {
    if (!checkSocketRateLimit(socket)) return;
    originalOnEvent.call(this, packet);
  };

  // Join rooms based on client needs
  socket.on('join-listings', (filters) => {
    console.log(`📋 Client ${socket.id} joined listings room with filters:`, filters);
    socket.join('listings');
    if (filters?.category) {
      socket.join(`listings-${filters.category}`);
    }
  });

  socket.on('join-listing', (listingId) => {
    console.log(`🏠 Client ${socket.id} joined listing room: ${listingId}`);
    socket.join(`listing-${listingId}`);
  });

  socket.on('leave-listings', () => {
    console.log(`📤 Client ${socket.id} left listings room`);
    socket.leave('listings');
  });

  socket.on('leave-listing', (listingId) => {
    console.log(`📤 Client ${socket.id} left listing room: ${listingId}`);
    socket.leave(`listing-${listingId}`);
  });

  // Handle search requests
  socket.on('search-listings', async (searchData) => {
    try {
      console.log(`🔍 Search request from ${socket.id}:`, JSON.stringify(searchData, null, 2));
      // Import the controller function
      const { getListings } = require('./src/controllers/listingController');

      // Transform array parameters to strings (like URL query parameters)
      const transformedQuery = { ...searchData };
      if (Array.isArray(transformedQuery.priceRange)) {
        transformedQuery.priceRange = transformedQuery.priceRange.join(',');
      }
      if (Array.isArray(transformedQuery.propertyTypes)) {
        transformedQuery.propertyTypes = transformedQuery.propertyTypes.join(',');
      }
      if (Array.isArray(transformedQuery.amenities)) {
        transformedQuery.amenities = transformedQuery.amenities.join(',');
      }
      if (Array.isArray(transformedQuery.features)) {
        transformedQuery.features = transformedQuery.features.join(',');
      }

      // ✅ Get feature flags for Socket.IO requests
      const featureFlagCache = require('./src/services/featureFlagCache');
      const flags = await featureFlagCache.getFlags();

      // Create a mock request object
      const mockReq = {
        query: transformedQuery,
        user: socket.user || null,
        features: flags.features // ✅ Add feature flags to Socket.IO requests
      };

      // Create a mock response object that emits via socket
      const mockRes = {
        status: () => mockRes,
        json: (data) => {
          console.log('🔌 Socket.IO search response:', JSON.stringify(data, null, 2));
          socket.emit('listings-data', {
            success: true,
            data: data,
            filters: searchData
          });
        }
      };

      const mockNext = (error) => {
        console.error('Search error:', error);
        socket.emit('listings-error', {
          success: false,
          error: error.message || 'Search failed',
          filters: searchData
        });
      };

      // Execute the search
      await getListings(mockReq, mockRes, mockNext);
    } catch (error) {
      console.error('Socket search error:', error);
      socket.emit('listings-error', {
        success: false,
        error: error.message || 'Search failed',
        filters: searchData
      });
    }
  });

  // ==================== MESSAGE & CONVERSATION EVENTS ====================

  // Join conversation room
  socket.on('join_conversation', async (conversationId) => {
    if (!socket.user) {
      return socket.emit('error', { message: 'Authentication required to join conversation' });
    }

    try {
      // Verify user is participant in this conversation
      const { Conversation } = require('./src/models/Message');
      const conversation = await Conversation.findById(conversationId);

      if (!conversation) {
        return socket.emit('error', { message: 'Conversation not found' });
      }

      const isParticipant = conversation.participants.some(
        p => p.user.toString() === socket.user._id.toString()
      );

      if (!isParticipant) {
        return socket.emit('error', { message: 'Not authorized to join this conversation' });
      }

      socket.join(`conversation-${conversationId}`);
      console.log(`💬 User ${socket.user._id} joined conversation ${conversationId}`);

      socket.emit('conversation_joined', { conversationId });
    } catch (error) {
      console.error('Error joining conversation:', error);
      socket.emit('error', { message: 'Failed to join conversation' });
    }
  });

  // Leave conversation room
  socket.on('leave_conversation', (conversationId) => {
    socket.leave(`conversation-${conversationId}`);
    console.log(`📤 User ${socket.user?._id} left conversation ${conversationId}`);
  });

  // Send message via socket
  socket.on('send_message', async (data) => {
    if (!socket.user) {
      return socket.emit('error', { message: 'Authentication required to send messages' });
    }

    try {
      const { conversationId, content, type = 'text', attachments = [] } = data;

      if (!conversationId || !content) {
        return socket.emit('error', { message: 'Conversation ID and content are required' });
      }

      const { Conversation, Message } = require('./src/models/Message');
      const Booking = require('./src/models/Booking');
      const moderationService = require('./src/services/moderationService');

      // Verify conversation exists and user is participant
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return socket.emit('error', { message: 'Conversation not found' });
      }

      const isParticipant = conversation.participants.some(
        p => p.user.toString() === socket.user._id.toString()
      );

      if (!isParticipant) {
        return socket.emit('error', { message: 'Not authorized to send messages in this conversation' });
      }

      // Check if booking is confirmed/paid (skip external contact moderation)
      let skipExternalContact = false;
      if (conversation.booking) {
        const booking = await Booking.findById(conversation.booking).select('status');
        if (booking && ['confirmed', 'completed'].includes(booking.status)) {
          skipExternalContact = true;
        }
      }

      // Run content moderation
      let finalContent = content;
      let moderationData = {};
      let shouldAddWarning = false;
      let warningMessage = null;

      if (type === 'text' && content) {
        const moderation = await moderationService.checkContent(content, 'message', {
          userId: socket.user._id.toString(),
          skipExternalContact,
          metadata: { conversationId }
        });

        if (moderation.action === 'mask' && moderation.maskedContent) {
          finalContent = moderation.maskedContent;
          shouldAddWarning = true;
          warningMessage = moderation.warningMessage;
          moderationData = {
            flagged: true,
            moderationFlags: moderation.flags,
            moderationScore: moderation.totalScore,
            flagReason: 'Auto-moderated: content masked'
          };
        } else if (moderation.action === 'flag') {
          moderationData = {
            flagged: true,
            moderationFlags: moderation.flags,
            moderationScore: moderation.totalScore,
            flagReason: 'Auto-flagged by moderation system'
          };
        }

        // Notify admins (fire-and-forget)
        if (moderation.action === 'mask' || moderation.action === 'flag') {
          moderationService.notifyAdminsOfFlaggedMessage({
            userId: socket.user._id.toString(), action: moderation.action,
            flags: moderation.flags, originalContent: content,
            conversationId, totalScore: moderation.totalScore
          });
        }
      }

      // Create message with (possibly masked) content
      const message = await Message.create({
        conversation: conversationId,
        sender: socket.user._id,
        content: finalContent,
        type,
        attachments,
        ...moderationData
      });

      await message.populate('sender', 'firstName lastName avatar role');

      // Update conversation's last message
      conversation.lastMessage = {
        content: finalContent,
        sender: socket.user._id,
        sentAt: message.createdAt
      };

      // Create system warning message if content was moderated
      let systemMsg = null;
      if (shouldAddWarning && warningMessage) {
        systemMsg = await Message.create({
          conversation: conversationId,
          sender: socket.user._id,
          content: warningMessage,
          type: 'system',
          systemData: {
            action: 'moderation_warning',
            metadata: { triggeredFlags: moderationData.moderationFlags || [] }
          }
        });
        await systemMsg.populate('sender', 'firstName lastName avatar role');
        conversation.messageCount = (conversation.messageCount || 0) + 2;
      }

      await conversation.save();

      // Emit to conversation room (including sender for confirmation)
      io.to(`conversation-${conversationId}`).emit('new_message', {
        conversationId,
        message: message.toObject()
      });

      // Emit system warning after the message
      if (systemMsg) {
        io.to(`conversation-${conversationId}`).emit('new_message', {
          conversationId,
          message: systemMsg.toObject()
        });
      }

      // Also emit to other participants' user rooms (for notifications)
      const recipientIds = conversation.participants
        .filter(p => p.user.toString() !== socket.user._id.toString())
        .map(p => p.user.toString());

      recipientIds.forEach(recipientId => {
        io.to(`user-${recipientId}`).emit('message_notification', {
          conversationId,
          message: message.toObject()
        });
      });

    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message', error: error.message });
    }
  });

  // Typing indicator
  socket.on('typing', (conversationId) => {
    if (!socket.user) return;

    console.log(`⌨️ User ${socket.user._id} typing in conversation ${conversationId}`);
    socket.to(`conversation-${conversationId}`).emit('user_typing', {
      userId: socket.user._id,
      userName: `${socket.user.firstName} ${socket.user.lastName}`,
      conversationId
    });
  });

  // Stop typing indicator
  socket.on('stop_typing', (conversationId) => {
    if (!socket.user) return;

    socket.to(`conversation-${conversationId}`).emit('user_stop_typing', {
      userId: socket.user._id,
      conversationId
    });
  });

  // Mark messages as read
  socket.on('mark_as_read', async (conversationId) => {
    if (!socket.user) return;

    try {
      const { Conversation } = require('./src/models/Message');
      const conversation = await Conversation.findById(conversationId);

      if (!conversation) {
        return socket.emit('error', { message: 'Conversation not found' });
      }

      await conversation.markAsRead(socket.user._id);

      // Notify other participants
      socket.to(`conversation-${conversationId}`).emit('messages_read', {
        conversationId,
        userId: socket.user._id,
        readAt: new Date()
      });

      console.log(`✅ User ${socket.user._id} marked conversation ${conversationId} as read`);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Rate limiters imported from ./src/middleware/rateLimiter.js

// Middleware
// Enhanced Helmet security configuration
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com", "https://accounts.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "http://localhost:5000"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://api.stripe.com", "https://accounts.google.com", "wss:", "ws:"],
      frameSrc: ["'self'", "https://js.stripe.com", "https://accounts.google.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true
}));
// Enhanced CORS configuration - restrict localhost to development only
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://baytup.fr', 'https://www.baytup.fr']
  : ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://baytup.fr', 'https://www.baytup.fr'];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (Postman, mobile apps, server-to-server)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Pages'],
  maxAge: 86400 // 24 hours
}));

// Add OPTIONS handling for preflight requests
app.options('*', cors());
app.use(compression());
app.use(morgan('combined'));

// Stripe webhook needs raw body for signature verification
// This MUST come BEFORE express.json()
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// XSS Sanitization middleware - sanitize all user input
app.use(sanitizeInput);

// Pagination sanitization middleware - prevent NaN, negative, or excessive values
app.use((req, res, next) => {
  if (req.query.page) {
    const page = parseInt(req.query.page);
    req.query.page = (isNaN(page) || page < 1) ? '1' : String(Math.min(page, 1000));
  }
  if (req.query.limit) {
    const limit = parseInt(req.query.limit);
    req.query.limit = (isNaN(limit) || limit < 1) ? '20' : String(Math.min(limit, 100));
  }
  next();
});

// Security headers for all uploaded files
const uploadSecurityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'");
  next();
};

// Serve static files - public assets (listings, reviews, avatars)
app.use('/uploads/listings', uploadSecurityHeaders, express.static(path.join(__dirname, 'uploads/listings')));
app.use('/uploads/reviews', uploadSecurityHeaders, express.static(path.join(__dirname, 'uploads/reviews')));
app.use('/uploads/users', uploadSecurityHeaders, express.static(path.join(__dirname, 'uploads/users')));

// Protected documents (IDs, host applications) - require authentication
const { protect } = require('./src/middleware/auth');
app.use('/uploads/documents', protect, uploadSecurityHeaders, express.static(path.join(__dirname, 'uploads/documents')));

// ✅ Feature Flags Middleware - inject feature flags into all requests
const { injectFeatureFlags } = require('./src/middleware/featureFlags');
app.use(injectFeatureFlags);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Baytup Server is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    port: process.env.PORT || 5000
  });
});

// Apply global API rate limiter to all /api/ routes
app.use('/api/', apiLimiter);

// Apply specific rate limiters to auth routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgotpassword', authLimiter);
app.use('/api/auth/resetpassword', strictLimiter);
app.use('/api/auth/verify-email', strictLimiter);
app.use('/api/auth/resend-verification', strictLimiter);

// Apply search rate limiter to listings GET route
app.use('/api/listings', searchLimiter);

// Apply webhook rate limiter
app.use('/api/webhooks', webhookLimiter);

// API Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/auth/2fa', require('./src/routes/twoFactor'));

// Route handlers (global apiLimiter already applied to all /api/ routes above)
// Route-specific limiters (searchLimiter, webhookLimiter) also applied above
app.use('/api/listings', require('./src/routes/listings'));
app.use('/api/bookings', require('./src/routes/bookings'));
app.use('/api/reviews', require('./src/routes/reviews'));
app.use('/api/messages', require('./src/routes/messages'));
app.use('/api/host-applications', require('./src/routes/hostApplications'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/admin/host-applications', require('./src/routes/adminHostApplicationRoutes'));
app.use('/api/wishlists', require('./src/routes/wishlistRoutes'));
app.use('/api/dashboard', require('./src/routes/dashboardRoutes'));
app.use('/api/settings', require('./src/routes/settings'));
app.use('/api/earnings', require('./src/routes/earnings'));
app.use('/api/payouts', require('./src/routes/payout'));
app.use('/api/notifications', require('./src/routes/notifications'));
app.use('/api/webhooks', require('./src/routes/webhooks'));
app.use('/api/disputes', require('./src/routes/disputes'));
app.use('/api/moderation', require('./src/routes/moderation'));
app.use('/api/tickets', require('./src/routes/tickets'));
app.use('/api/cities', require('./src/routes/cities'));
app.use('/api/faq', require('./src/routes/faq'));
app.use('/api/escrow', require('./src/routes/escrow'));
app.use('/api/stripe-connect', require('./src/routes/stripeConnect'));
app.use('/api/pricing', require('./src/routes/pricing'));
app.use('/api/calendar', require('./src/routes/calendar'));
app.use('/api/geocode', require('./src/routes/geocode'));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      status: 'error',
      message: 'Validation Error',
      errors
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid resource ID'
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      status: 'error',
      message: `${field} already exists`
    });
  }

  res.status(err.statusCode || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error'
  });
});

// Start server with Socket.IO
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Baytup Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔌 Socket.IO enabled for real-time features`);
});