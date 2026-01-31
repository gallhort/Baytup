const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createTicket,
  getTickets,
  getTicket,
  addMessage,
  updateTicket,
  assignTicket,
  rateTicket,
  getTicketStats,
  deleteTicket
} = require('../controllers/ticketController');
const emailToTicketService = require('../services/emailToTicketService');

// Public routes

// @route   POST /api/tickets/webhook/email
// @desc    Email-to-ticket webhook (Mailgun, SendGrid, etc.)
// @access  Public (webhook)
router.post('/webhook/email', async (req, res) => {
  try {
    // Optional: Validate webhook signature here
    // Example for Mailgun:
    // const isValid = emailToTicketService.validateMailgunSignature(
    //   req.body.timestamp,
    //   req.body.token,
    //   req.body.signature,
    //   process.env.MAILGUN_SIGNING_KEY
    // );
    // if (!isValid) {
    //   return res.status(403).json({ success: false, error: 'Invalid signature' });
    // }

    const result = await emailToTicketService.processIncomingEmail(req.body);

    res.status(200).json({
      success: result.success,
      action: result.action,
      ticketNumber: result.ticket?.ticketNumber,
      error: result.error
    });
  } catch (error) {
    console.error('Email webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process email'
    });
  }
});

// Protected routes
router.use(protect);

// @route   GET /api/tickets/stats
// @desc    Get ticket statistics (Admin/Agent only)
// @access  Private (Admin/Agent)
router.get('/stats', getTicketStats);

// @route   GET /api/tickets
// @desc    Get all tickets (filtered by role)
// @access  Private
router.get('/', getTickets);

// @route   POST /api/tickets
// @desc    Create new ticket
// @access  Private
router.post('/', createTicket);

// @route   GET /api/tickets/:id
// @desc    Get single ticket
// @access  Private
router.get('/:id', getTicket);

// @route   PATCH /api/tickets/:id
// @desc    Update ticket (status, priority, etc.)
// @access  Private (Admin/Agent only)
router.patch('/:id', updateTicket);

// @route   DELETE /api/tickets/:id
// @desc    Delete ticket
// @access  Private (Admin only)
router.delete('/:id', deleteTicket);

// @route   POST /api/tickets/:id/messages
// @desc    Add message to ticket
// @access  Private
router.post('/:id/messages', addMessage);

// @route   PATCH /api/tickets/:id/assign
// @desc    Assign ticket to agent
// @access  Private (Admin/Agent only)
router.patch('/:id/assign', assignTicket);

// @route   PATCH /api/tickets/:id/rate
// @desc    Rate ticket (customer satisfaction)
// @access  Private (ticket owner only)
router.patch('/:id/rate', rateTicket);

module.exports = router;
