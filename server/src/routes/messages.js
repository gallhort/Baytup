const express = require('express');
const {
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
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');
const {
  sendMessageValidation,
  createConversationValidation,
  mongoIdValidation,
  validate
} = require('../utils/validation');

const router = express.Router();

// Protect all routes - require authentication
router.use(protect);

// Admin routes (must come before other routes to avoid conflicts)
router.get('/admin/stats', getMessageStatsAdmin);
router.get('/admin/conversations', getAllConversationsAdmin);
router.get('/admin/conversations/:id', mongoIdValidation, validate, getConversationAdmin);
router.delete('/admin/conversations/:id', mongoIdValidation, validate, deleteConversationAdmin);

// Statistics and search routes
router.get('/stats', getMessageStats);
router.get('/search', searchMessages);

// Conversation routes
router.get('/conversations', getConversations);
router.post('/conversations', createConversationValidation, validate, createConversation);
router.get('/conversations/:id', mongoIdValidation, validate, getConversation);
router.delete('/conversations/:id', mongoIdValidation, validate, deleteConversation);
router.put('/conversations/:id/read', mongoIdValidation, validate, markAsRead);
router.put('/conversations/:id/archive', mongoIdValidation, validate, archiveConversation);
router.put('/conversations/:id/unarchive', mongoIdValidation, validate, unarchiveConversation);

// Message routes
router.post('/', sendMessageValidation, validate, sendMessage);
router.put('/:id', mongoIdValidation, validate, updateMessage);
router.delete('/:id', mongoIdValidation, validate, deleteMessage);

// Test route
router.get('/test', (req, res) => {
  res.json({
    status: 'success',
    message: 'Messages API is working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
