const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAllApplications,
  getApplication,
  updateApplication,
  updateStatus,
  approveApplication,
  rejectApplication,
  requestResubmission,
  deleteApplication
} = require('../controllers/hostApplicationController');

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// Get all applications with filtering and pagination
router.get('/', getAllApplications);

// Get single application details
router.get('/:id', getApplication);

// Update application
router.put('/:id', updateApplication);

// Update application status
router.put('/:id/status', updateStatus);

// Approve application
router.put('/:id/approve', approveApplication);

// Reject application with reason
router.put('/:id/reject', rejectApplication);

// Request resubmission with notes
router.put('/:id/request-resubmission', requestResubmission);

// Delete application (only rejected or pending)
router.delete('/:id', deleteApplication);

module.exports = router;