const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./src/config/database');
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

  // Seed default moderation rules (only if not already seeded)
  try {
    const ModerationRule = require('./src/models/ModerationRule');
    const count = await ModerationRule.countDocuments();

    if (count === 0) {
      console.log('⚙️  Seeding default moderation rules...');
      const moderationService = require('./src/services/moderationService');
      await moderationService.seedDefaultRules();
      console.log('✅ Default moderation rules seeded successfully');
    } else {
      console.log(`✅ Moderation rules already exist (${count} rules)`);
    }
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

      // Create message
      const message = await Message.create({
        conversation: conversationId,
        sender: socket.user._id,
        content,
        type,
        attachments
      });

      await message.populate('sender', 'firstName lastName avatar role');

      // Update conversation's last message
      conversation.lastMessage = {
        content: message.content,
        sender: socket.user._id,
        sentAt: message.createdAt
      };
      await conversation.save();

      console.log(`📨 Message sent in conversation ${conversationId} by user ${socket.user._id}`);

      // Emit to conversation room (including sender for confirmation)
      io.to(`conversation-${conversationId}`).emit('new_message', {
        conversationId,
        message: message.toObject()
      });

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

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX),
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// More lenient rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window
  message: {
    error: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Very lenient rate limiter for email verification (people may click multiple times)
const verifyEmailLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 attempts per minute
  message: {
    error: 'Too many verification attempts, please wait a moment and try again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// More lenient rate limiter for listings endpoint (used heavily by homepage)
const listingsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute (allows homepage to make multiple requests)
  message: {
    error: 'Too many requests, please try again shortly.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// More lenient rate limiter for wishlist checks
const wishlistLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // 200 requests per minute
  message: {
    error: 'Too many wishlist requests, please try again shortly.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

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

// Apply specific rate limiters to auth routes
app.use('/api/auth/verify-email', verifyEmailLimiter);
app.use('/api/auth/resend-verification', verifyEmailLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

// API Routes (will be added)
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/auth/2fa', limiter, require('./src/routes/twoFactor')); // ✅ NEW: Two-Factor Authentication

// Apply general rate limiter to other routes
// app.use('/api/users', limiter, require('./src/routes/users')); // Empty route - user ops via /api/auth, /api/admin, /api/settings
app.use('/api/listings', listingsLimiter, require('./src/routes/listings')); // Use more lenient limiter
app.use('/api/bookings', limiter, require('./src/routes/bookings'));
app.use('/api/reviews', limiter, require('./src/routes/reviews'));
app.use('/api/messages', limiter, require('./src/routes/messages'));
// app.use('/api/payments', limiter, require('./src/routes/payments')); // Empty route - payments via /api/bookings
app.use('/api/host-applications', limiter, require('./src/routes/hostApplications'));
app.use('/api/admin', limiter, require('./src/routes/admin'));
app.use('/api/admin/host-applications', limiter, require('./src/routes/adminHostApplicationRoutes'));
app.use('/api/wishlists', wishlistLimiter, require('./src/routes/wishlistRoutes')); // Use more lenient limiter
app.use('/api/dashboard', limiter, require('./src/routes/dashboardRoutes'));
app.use('/api/settings', limiter, require('./src/routes/settings'));
app.use('/api/earnings', limiter, require('./src/routes/earnings'));
app.use('/api/payouts', limiter, require('./src/routes/payout'));
app.use('/api/notifications', limiter, require('./src/routes/notifications'));
app.use('/api/webhooks', require('./src/routes/webhooks')); // Webhook routes (no rate limiting for external services)
// ✅ NOUVELLE ROUTE: Disputes
app.use('/api/disputes', limiter, require('./src/routes/disputes'));
// ✅ NOUVELLE ROUTE: Moderation (Admin)
app.use('/api/moderation', limiter, require('./src/routes/moderation'));
// ✅ NOUVELLE ROUTE: Support Tickets
app.use('/api/tickets', limiter, require('./src/routes/tickets'));
// ✅ NOUVELLE ROUTE: Cities (alternative gratuite à Google Places Autocomplete)
app.use('/api/cities', require('./src/routes/cities'));
app.use('/api/faq', require('./src/routes/faq')); // ✅ NEW: FAQ / Knowledge Base
app.use('/api/escrow', limiter, require('./src/routes/escrow')); // ✅ NEW: Escrow / Séquestre
app.use('/api/stripe-connect', limiter, require('./src/routes/stripeConnect')); // ✅ NEW: Stripe Connect for host payouts
app.use('/api/pricing', limiter, require('./src/routes/pricing')); // ✅ NEW: Dynamic Pricing Calculator

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