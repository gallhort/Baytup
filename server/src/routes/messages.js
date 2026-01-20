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

const router = express.Router();

// Protect all routes - require authentication
router.use(protect);

// Admin routes (must come before other routes to avoid conflicts)
router.get('/admin/stats', getMessageStatsAdmin);
router.get('/admin/conversations', getAllConversationsAdmin);
router.get('/admin/conversations/:id', getConversationAdmin);
router.delete('/admin/conversations/:id', deleteConversationAdmin);

// Statistics and search routes
router.get('/stats', getMessageStats);
router.get('/search', searchMessages);

// Conversation routes
router.get('/conversations', getConversations);
router.post('/conversations', createConversation);
router.get('/conversations/:id', getConversation);
router.delete('/conversations/:id', deleteConversation);
router.put('/conversations/:id/read', markAsRead);
router.put('/conversations/:id/archive', archiveConversation);
router.put('/conversations/:id/unarchive', unarchiveConversation);

// Message routes
router.post('/', sendMessage);
router.put('/:id', updateMessage);
router.delete('/:id', deleteMessage);

// Test route
router.get('/test', (req, res) => {
  res.json({
    status: 'success',
    message: 'Messages API is working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
