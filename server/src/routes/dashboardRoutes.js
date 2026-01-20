const express = require('express');
const {
  getAdminDashboard,
  getHostDashboard,
  getGuestDashboard,
  getQuickStats
} = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All dashboard routes require authentication
router.use(protect);

// Quick stats for all users
router.get('/quick-stats', getQuickStats);

// Admin dashboard
router.get('/admin', authorize('admin'), getAdminDashboard);

// Host dashboard
router.get('/host', authorize('host', 'admin'), getHostDashboard);

// Guest dashboard
router.get('/guest', getGuestDashboard);

module.exports = router;