const express = require('express');
const {
  getAllApplications,
  getApplication,
  approveApplication,
  rejectApplication,
  requestResubmission
} = require('../controllers/hostApplicationController');
const {
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  updateUserRole,
  blockUser,
  activateUser,
  deleteUser,
  permanentlyDeleteUser,
  resetUserPassword,
  getUserStats,
  verifyUserEmail
} = require('../controllers/adminUserController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and admin authorization
router.use(protect);
router.use(authorize('admin'));

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Admin route working' });
});

// ===== USER MANAGEMENT ROUTES =====

// @route   GET /api/admin/users/stats
// @desc    Get user statistics
// @access  Admin only
router.get('/users/stats', getUserStats);

// @route   GET /api/admin/users
// @desc    Get all users with filtering and pagination
// @access  Admin only
router.get('/users', getAllUsers);

// @route   POST /api/admin/users
// @desc    Create new user
// @access  Admin only
router.post('/users', createUser);

// @route   GET /api/admin/users/:id
// @desc    Get single user
// @access  Admin only
router.get('/users/:id', getUser);

// @route   PUT /api/admin/users/:id
// @desc    Update user
// @access  Admin only
router.put('/users/:id', updateUser);

// @route   DELETE /api/admin/users/:id
// @desc    Soft delete user
// @access  Admin only
router.delete('/users/:id', deleteUser);

// @route   DELETE /api/admin/users/:id/permanent
// @desc    Permanently delete user
// @access  Admin only
router.delete('/users/:id/permanent', permanentlyDeleteUser);

// @route   PATCH /api/admin/users/:id/role
// @desc    Update user role
// @access  Admin only
router.patch('/users/:id/role', updateUserRole);

// @route   PATCH /api/admin/users/:id/block
// @desc    Block/unblock user
// @access  Admin only
router.patch('/users/:id/block', blockUser);

// @route   PATCH /api/admin/users/:id/activate
// @desc    Activate/deactivate user
// @access  Admin only
router.patch('/users/:id/activate', activateUser);

// @route   PATCH /api/admin/users/:id/reset-password
// @desc    Reset user password
// @access  Admin only
router.patch('/users/:id/reset-password', resetUserPassword);

// @route   PATCH /api/admin/users/:id/verify-email
// @desc    Verify user email
// @access  Admin only
router.patch('/users/:id/verify-email', verifyUserEmail);

// ===== HOST APPLICATION MANAGEMENT ROUTES =====

// @route   GET /api/admin/host-applications
// @desc    Get all host applications with filtering and pagination
// @access  Admin only
router.get('/host-applications', getAllApplications);

// @route   GET /api/admin/host-applications/:id
// @desc    Get single host application
// @access  Admin only
router.get('/host-applications/:id', getApplication);

// @route   PUT /api/admin/host-applications/:id/approve
// @desc    Approve host application and upgrade user to host
// @access  Admin only
router.put('/host-applications/:id/approve', approveApplication);

// @route   PUT /api/admin/host-applications/:id/reject
// @desc    Reject host application
// @access  Admin only
router.put('/host-applications/:id/reject', rejectApplication);

// @route   PUT /api/admin/host-applications/:id/request-resubmission
// @desc    Request application resubmission with notes
// @access  Admin only
router.put('/host-applications/:id/request-resubmission', requestResubmission);

module.exports = router;