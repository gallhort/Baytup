const Ticket = require('../models/Ticket');
const User = require('../models/User');
const Notification = require('../models/Notification');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');

// @desc    Create new ticket
// @route   POST /api/tickets
// @access  Private
const createTicket = catchAsync(async (req, res, next) => {
  const { subject, description, category, priority, relatedBooking, relatedListing, relatedDispute } = req.body;

  if (!subject || !description) {
    return next(new AppError('Subject and description are required', 400));
  }

  const ticket = await Ticket.create({
    user: req.user.id,
    subject,
    description,
    category: category || 'other',
    priority: priority || 'normal',
    relatedBooking,
    relatedListing,
    relatedDispute,
    messages: [{
      sender: req.user.id,
      senderType: 'user',
      content: description,
      createdAt: new Date()
    }]
  });

  await ticket.populate('user', 'firstName lastName email avatar');

  // Notify admins/agents
  try {
    const admins = await User.find({ role: { $in: ['admin', 'agent'] } }).select('_id');
    for (const admin of admins) {
      await Notification.createNotification({
        recipient: admin._id,
        sender: req.user.id,
        type: 'ticket_created',
        title: 'Nouveau ticket support 🎫',
        message: `${req.user.firstName} ${req.user.lastName} a créé un ticket: "${subject}"`,
        data: {
          ticketId: ticket._id,
          ticketNumber: ticket.ticketNumber,
          category: ticket.category,
          priority: ticket.priority
        },
        link: `/dashboard/admin/tickets/${ticket._id}`,
        priority: ticket.priority === 'urgent' ? 'high' : 'normal'
      });
    }
  } catch (error) {
    console.error('Error notifying admins about new ticket:', error);
  }

  res.status(201).json({
    success: true,
    data: { ticket }
  });
});

// @desc    Get all tickets (user sees only their tickets, admin/agent sees all)
// @route   GET /api/tickets
// @access  Private
const getTickets = catchAsync(async (req, res, next) => {
  const {
    page = 1,
    limit = 20,
    status,
    priority,
    category,
    assignedTo,
    search
  } = req.query;

  // Build query
  let query = {};

  // Role-based filtering
  if (req.user.role === 'user' || req.user.role === 'host' || req.user.role === 'guest') {
    query.user = req.user.id;
  } else if (req.user.role === 'agent') {
    // Agent sees tickets assigned to them + unassigned
    query.$or = [
      { assignedTo: req.user.id },
      { assignedTo: null }
    ];
  }
  // Admin sees all (no filter)

  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (category) query.category = category;
  if (assignedTo) query.assignedTo = assignedTo;

  if (search) {
    query.$or = [
      { subject: { $regex: search, $options: 'i' } },
      { ticketNumber: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (page - 1) * limit;
  const tickets = await Ticket.find(query)
    .populate('user', 'firstName lastName email avatar')
    .populate('assignedTo', 'firstName lastName avatar')
    .sort('-lastActivityAt')
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  const total = await Ticket.countDocuments(query);

  res.status(200).json({
    success: true,
    results: tickets.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    },
    data: { tickets }
  });
});

// @desc    Get single ticket
// @route   GET /api/tickets/:id
// @access  Private
const getTicket = catchAsync(async (req, res, next) => {
  const ticket = await Ticket.findById(req.params.id)
    .populate('user', 'firstName lastName email avatar')
    .populate('assignedTo', 'firstName lastName avatar')
    .populate('messages.sender', 'firstName lastName avatar role')
    .populate('relatedBooking')
    .populate('relatedListing', 'title')
    .populate('relatedDispute');

  if (!ticket) {
    return next(new AppError('Ticket not found', 404));
  }

  // Authorization check
  const isOwner = ticket.user._id.toString() === req.user.id;
  const isAgent = req.user.role === 'agent' || req.user.role === 'admin';
  const isAssigned = ticket.assignedTo && ticket.assignedTo._id.toString() === req.user.id;

  if (!isOwner && !isAgent && !isAssigned) {
    return next(new AppError('Not authorized to view this ticket', 403));
  }

  res.status(200).json({
    success: true,
    data: { ticket }
  });
});

// @desc    Add message to ticket
// @route   POST /api/tickets/:id/messages
// @access  Private
const addMessage = catchAsync(async (req, res, next) => {
  const { content, attachments, isInternal } = req.body;

  if (!content) {
    return next(new AppError('Message content is required', 400));
  }

  const ticket = await Ticket.findById(req.params.id);

  if (!ticket) {
    return next(new AppError('Ticket not found', 404));
  }

  // Authorization check
  const isOwner = ticket.user.toString() === req.user.id;
  const isAgent = req.user.role === 'agent' || req.user.role === 'admin';
  const isAssigned = ticket.assignedTo && ticket.assignedTo.toString() === req.user.id;

  if (!isOwner && !isAgent && !isAssigned) {
    return next(new AppError('Not authorized to add messages to this ticket', 403));
  }

  // Determine sender type
  let senderType = 'user';
  if (req.user.role === 'admin' || req.user.role === 'agent') {
    senderType = 'agent';
  }

  // Only agents can create internal notes
  const internal = isAgent && isInternal === true;

  const message = await ticket.addMessage(
    req.user.id,
    content,
    senderType,
    attachments || [],
    internal
  );

  await ticket.populate('messages.sender', 'firstName lastName avatar role');

  // Notify relevant parties (unless internal note)
  if (!internal) {
    try {
      if (senderType === 'agent') {
        // Agent replied → notify ticket owner
        await Notification.createNotification({
          recipient: ticket.user,
          sender: req.user.id,
          type: 'ticket_reply',
          title: 'Réponse à votre ticket 💬',
          message: `Support a répondu à votre ticket ${ticket.ticketNumber}`,
          data: {
            ticketId: ticket._id,
            ticketNumber: ticket.ticketNumber
          },
          link: `/dashboard/support/${ticket._id}`,
          priority: 'normal'
        });
      } else {
        // User replied → notify assigned agent or all admins
        const recipients = ticket.assignedTo
          ? [ticket.assignedTo]
          : await User.find({ role: { $in: ['admin', 'agent'] } }).select('_id');

        for (const recipient of recipients) {
          await Notification.createNotification({
            recipient: recipient._id || recipient,
            sender: req.user.id,
            type: 'ticket_updated',
            title: 'Nouveau message ticket 📩',
            message: `Nouveau message sur le ticket ${ticket.ticketNumber}`,
            data: {
              ticketId: ticket._id,
              ticketNumber: ticket.ticketNumber
            },
            link: `/dashboard/admin/tickets/${ticket._id}`,
            priority: 'normal'
          });
        }
      }
    } catch (error) {
      console.error('Error sending ticket message notification:', error);
    }
  }

  res.status(200).json({
    success: true,
    data: { message, ticket }
  });
});

// @desc    Update ticket (status, priority, assignment, etc.)
// @route   PATCH /api/tickets/:id
// @access  Private (Admin/Agent only)
const updateTicket = catchAsync(async (req, res, next) => {
  // Only admin/agent can update tickets
  if (req.user.role !== 'admin' && req.user.role !== 'agent') {
    return next(new AppError('Only admins and agents can update tickets', 403));
  }

  const { status, priority, category, assignedTo, tags } = req.body;

  const ticket = await Ticket.findById(req.params.id);

  if (!ticket) {
    return next(new AppError('Ticket not found', 404));
  }

  // Update fields
  if (status) ticket.status = status;
  if (priority) ticket.priority = priority;
  if (category) ticket.category = category;
  if (assignedTo !== undefined) ticket.assignedTo = assignedTo;  // null allowed
  if (tags) ticket.tags = tags;

  await ticket.save();
  await ticket.populate('user', 'firstName lastName email avatar');
  await ticket.populate('assignedTo', 'firstName lastName avatar');

  // Notify user if status changed to resolved or closed
  if (status === 'resolved' || status === 'closed') {
    try {
      await Notification.createNotification({
        recipient: ticket.user._id,
        sender: req.user.id,
        type: 'ticket_resolved',
        title: `Ticket ${status === 'resolved' ? 'résolu' : 'fermé'} ✅`,
        message: `Votre ticket ${ticket.ticketNumber} a été ${status === 'resolved' ? 'résolu' : 'fermé'}`,
        data: {
          ticketId: ticket._id,
          ticketNumber: ticket.ticketNumber,
          status
        },
        link: `/dashboard/support/${ticket._id}`,
        priority: 'normal'
      });
    } catch (error) {
      console.error('Error sending ticket status notification:', error);
    }
  }

  res.status(200).json({
    success: true,
    data: { ticket }
  });
});

// @desc    Assign ticket to agent
// @route   PATCH /api/tickets/:id/assign
// @access  Private (Admin/Agent only)
const assignTicket = catchAsync(async (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'agent') {
    return next(new AppError('Only admins and agents can assign tickets', 403));
  }

  const { agentId } = req.body;

  const ticket = await Ticket.findById(req.params.id);

  if (!ticket) {
    return next(new AppError('Ticket not found', 404));
  }

  if (agentId) {
    const agent = await User.findById(agentId);
    if (!agent || (agent.role !== 'admin' && agent.role !== 'agent')) {
      return next(new AppError('Invalid agent ID', 400));
    }
  }

  await ticket.assign(agentId);
  await ticket.populate('assignedTo', 'firstName lastName avatar');

  // Notify assigned agent
  if (agentId) {
    try {
      await Notification.createNotification({
        recipient: agentId,
        sender: req.user.id,
        type: 'ticket_assigned',
        title: 'Ticket assigné 🎫',
        message: `Le ticket ${ticket.ticketNumber} vous a été assigné`,
        data: {
          ticketId: ticket._id,
          ticketNumber: ticket.ticketNumber
        },
        link: `/dashboard/admin/tickets/${ticket._id}`,
        priority: ticket.priority === 'urgent' ? 'high' : 'normal'
      });
    } catch (error) {
      console.error('Error sending assignment notification:', error);
    }
  }

  res.status(200).json({
    success: true,
    data: { ticket }
  });
});

// @desc    Rate ticket (customer satisfaction)
// @route   PATCH /api/tickets/:id/rate
// @access  Private (ticket owner only)
const rateTicket = catchAsync(async (req, res, next) => {
  const { rating, feedback } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return next(new AppError('Rating must be between 1 and 5', 400));
  }

  const ticket = await Ticket.findById(req.params.id);

  if (!ticket) {
    return next(new AppError('Ticket not found', 404));
  }

  // Only owner can rate
  if (ticket.user.toString() !== req.user.id) {
    return next(new AppError('Only ticket owner can rate', 403));
  }

  // Can only rate resolved or closed tickets
  if (ticket.status !== 'resolved' && ticket.status !== 'closed') {
    return next(new AppError('Can only rate resolved or closed tickets', 400));
  }

  ticket.satisfaction = {
    rating,
    feedback: feedback || '',
    ratedAt: new Date()
  };

  await ticket.save();

  res.status(200).json({
    success: true,
    data: { ticket }
  });
});

// @desc    Get ticket statistics
// @route   GET /api/tickets/stats
// @access  Private (Admin/Agent only)
const getTicketStats = catchAsync(async (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'agent') {
    return next(new AppError('Only admins and agents can view ticket stats', 403));
  }

  const stats = await Ticket.getStats();

  // Additional stats
  const byCategory = await Ticket.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } }
  ]);

  const byPriority = await Ticket.aggregate([
    { $group: { _id: '$priority', count: { $sum: 1 } } }
  ]);

  const recentTickets = await Ticket.find()
    .sort('-createdAt')
    .limit(10)
    .populate('user', 'firstName lastName')
    .select('ticketNumber subject status priority createdAt')
    .lean();

  res.status(200).json({
    success: true,
    data: {
      overview: stats,
      byCategory,
      byPriority,
      recentTickets
    }
  });
});

// @desc    Delete ticket (Admin only)
// @route   DELETE /api/tickets/:id
// @access  Private (Admin only)
const deleteTicket = catchAsync(async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(new AppError('Only admins can delete tickets', 403));
  }

  const ticket = await Ticket.findByIdAndDelete(req.params.id);

  if (!ticket) {
    return next(new AppError('Ticket not found', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Ticket deleted successfully'
  });
});

module.exports = {
  createTicket,
  getTickets,
  getTicket,
  addMessage,
  updateTicket,
  assignTicket,
  rateTicket,
  getTicketStats,
  deleteTicket
};
