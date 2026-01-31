const express = require('express');
const router = express.Router();
const escrowController = require('../controllers/escrowController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// ============ USER ROUTES ============

// Get escrow for a booking (guest/host/admin)
router.get('/booking/:bookingId', escrowController.getBookingEscrow);

// Request refund (guest only) - creates dispute and freezes escrow
router.post('/:id/request-refund', escrowController.requestRefund);

// ============ ADMIN ROUTES ============

// Get all escrows
router.get('/admin/all', authorize('admin'), escrowController.getAllEscrows);

// Get escrow statistics
router.get('/admin/stats', authorize('admin'), escrowController.getEscrowStats);

// Get specific escrow by ID
router.get('/admin/:id', authorize('admin'), escrowController.getEscrowById);

// Manual release
router.post('/admin/:id/release', authorize('admin'), escrowController.manualRelease);

// Manual freeze
router.post('/admin/:id/freeze', authorize('admin'), escrowController.freezeEscrow);

// Resolve dispute (split between host and guest)
router.post('/admin/:id/resolve', authorize('admin'), escrowController.resolveDispute);

module.exports = router;
