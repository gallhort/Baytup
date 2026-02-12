const User = require('../models/User');
const Notification = require('../models/Notification');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');

// @desc    Get all users with filtering, sorting and pagination
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const {
    role,
    isActive,
    isBlocked,
    search,
    page = 1,
    limit = 20,
    sort = '-createdAt'
  } = req.query;

  // Build query
  const query = {};

  // Filter by role
  if (role && role !== 'all') {
    query.role = role;
  }

  // Filter by active status
  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  // Filter by blocked status
  if (isBlocked !== undefined) {
    query.isBlocked = isBlocked === 'true';
  }

  // Search by name or email (escape regex special chars to prevent NoSQL injection)
  if (search) {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { firstName: { $regex: escapedSearch, $options: 'i' } },
      { lastName: { $regex: escapedSearch, $options: 'i' } },
      { email: { $regex: escapedSearch, $options: 'i' } }
    ];
  }

  // Execute query with pagination
  const users = await User.find(query)
    .select('-password -passwordResetToken -passwordResetExpires -emailVerificationToken -emailVerificationExpires')
    .sort(sort)
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  // Get total count for pagination
  const total = await User.countDocuments(query);

  // Get statistics
  const stats = {
    total: await User.countDocuments(),
    guests: await User.countDocuments({ role: 'guest' }),
    hosts: await User.countDocuments({ role: 'host' }),
    admins: await User.countDocuments({ role: 'admin' }),
    active: await User.countDocuments({ isActive: true }),
    blocked: await User.countDocuments({ isBlocked: true })
  };

  res.status(200).json({
    status: 'success',
    results: users.length,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit)),
      total
    },
    stats,
    data: { users }
  });
});

// @desc    Get single user by ID
// @route   GET /api/admin/users/:id
// @access  Private/Admin
exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .select('-password -passwordResetToken -passwordResetExpires -emailVerificationToken -emailVerificationExpires')
    .populate('savedListings', 'title images price location');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { user }
  });
});

// @desc    Create new user
// @route   POST /api/admin/users
// @access  Private/Admin
exports.createUser = catchAsync(async (req, res, next) => {
  const {
    firstName,
    lastName,
    email,
    password,
    role,
    phone,
    dateOfBirth,
    gender,
    address,
    language,
    currency
  } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return next(new AppError('A user with this email already exists', 400));
  }

  // Create user
  const user = await User.create({
    firstName,
    lastName,
    email: email.toLowerCase(),
    password,
    role: role || 'guest',
    phone,
    dateOfBirth,
    gender,
    address,
    language: language || 'en',
    currency: currency || 'DZD',
    isEmailVerified: true, // Admin-created users are auto-verified
    isActive: true
  });

  // Remove password from output
  user.password = undefined;

  res.status(201).json({
    status: 'success',
    message: 'User created successfully',
    data: { user }
  });
});

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
exports.updateUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Fields that can be updated
  const allowedFields = [
    'firstName',
    'lastName',
    'email',
    'phone',
    'role',
    'dateOfBirth',
    'gender',
    'bio',
    'address',
    'language',
    'currency',
    'theme',
    'isActive',
    'isBlocked',
    'blockReason',
    'isEmailVerified'
  ];

  // Update only allowed fields
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      if (field === 'email') {
        user[field] = req.body[field].toLowerCase();
      } else {
        user[field] = req.body[field];
      }
    }
  });

  // Update nested address object if provided
  if (req.body.address) {
    user.address = {
      ...user.address.toObject ? user.address.toObject() : user.address,
      ...req.body.address
    };
  }

  // Save user
  await user.save({ validateBeforeSave: false });

  // Remove password from output
  user.password = undefined;

  res.status(200).json({
    status: 'success',
    message: 'User updated successfully',
    data: { user }
  });
});

// @desc    Update user role
// @route   PATCH /api/admin/users/:id/role
// @access  Private/Admin
exports.updateUserRole = catchAsync(async (req, res, next) => {
  const { role } = req.body;

  if (!['guest', 'host', 'admin'].includes(role)) {
    return next(new AppError('Invalid role', 400));
  }

  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Prevent updating own role
  if (user._id.toString() === req.user.id) {
    return next(new AppError('You cannot change your own role', 403));
  }

  const oldRole = user.role;
  user.role = role;

  // If upgrading to host, initialize host info
  if (role === 'host' && !user.hostInfo.isHost) {
    user.hostInfo.isHost = true;
    user.hostInfo.hostSince = new Date();
  }

  await user.save({ validateBeforeSave: false });

  // Create notification for user
  try {
    await Notification.createNotification({
      recipient: user._id,
      type: 'user_role_changed',
      title: 'Account Role Updated! 🔄',
      message: `Hi ${user.firstName}! Your account role has been updated from ${oldRole} to ${role} by an administrator. ${role === 'host' ? 'You can now list properties and vehicles!' : ''}`,
      data: {
        userId: user._id,
        oldRole: oldRole,
        newRole: role,
        updatedBy: req.user.id,
        updatedAt: new Date()
      },
      link: '/dashboard/settings',
      priority: 'high'
    });
  } catch (notificationError) {
    console.error('Error creating role change notification:', notificationError);
  }

  // Notify all admins
  try {
    const admins = await User.find({ role: 'admin', _id: { $ne: req.user.id } });
    for (const admin of admins) {
      await Notification.createNotification({
        recipient: admin._id,
        type: 'system',
        title: 'User Role Changed 👤',
        message: `${user.firstName} ${user.lastName}'s role was changed from ${oldRole} to ${role} by ${req.user.firstName} ${req.user.lastName}.`,
        data: {
          userId: user._id,
          userName: `${user.firstName} ${user.lastName}`,
          oldRole: oldRole,
          newRole: role
        },
        link: `/dashboard/users/${user._id}`,
        priority: 'normal'
      });
    }
  } catch (notificationError) {
    console.error('Error creating admin notification:', notificationError);
  }

  user.password = undefined;

  res.status(200).json({
    status: 'success',
    message: `User role updated to ${role}`,
    data: { user }
  });
});

// @desc    Block/unblock user
// @route   PATCH /api/admin/users/:id/block
// @access  Private/Admin
exports.blockUser = catchAsync(async (req, res, next) => {
  const { isBlocked, blockReason } = req.body;

  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Prevent blocking own account
  if (user._id.toString() === req.user.id) {
    return next(new AppError('You cannot block your own account', 403));
  }

  user.isBlocked = isBlocked;
  user.blockReason = isBlocked ? blockReason : undefined;

  await user.save({ validateBeforeSave: false });

  // Create notification for user
  try {
    await Notification.createNotification({
      recipient: user._id,
      type: isBlocked ? 'user_blocked' : 'user_unblocked',
      title: isBlocked ? 'Account Blocked ⛔' : 'Account Unblocked ✅',
      message: isBlocked
        ? `Hi ${user.firstName}, your account has been blocked by an administrator. Reason: ${blockReason}. Please contact support for assistance.`
        : `Hi ${user.firstName}, your account has been unblocked. You can now access all features again.`,
      data: {
        userId: user._id,
        isBlocked: isBlocked,
        blockReason: isBlocked ? blockReason : undefined,
        updatedBy: req.user.id,
        updatedAt: new Date()
      },
      link: '/dashboard/settings',
      priority: 'urgent'
    });
  } catch (notificationError) {
    console.error('Error creating block/unblock notification:', notificationError);
  }

  // Notify all admins
  try {
    const admins = await User.find({ role: 'admin', _id: { $ne: req.user.id } });
    for (const admin of admins) {
      await Notification.createNotification({
        recipient: admin._id,
        type: 'system',
        title: isBlocked ? 'User Blocked 🚫' : 'User Unblocked ✅',
        message: `${user.firstName} ${user.lastName} was ${isBlocked ? 'blocked' : 'unblocked'} by ${req.user.firstName} ${req.user.lastName}.${isBlocked ? ` Reason: ${blockReason}` : ''}`,
        data: {
          userId: user._id,
          userName: `${user.firstName} ${user.lastName}`,
          isBlocked: isBlocked,
          blockReason: isBlocked ? blockReason : undefined
        },
        link: `/dashboard/users/${user._id}`,
        priority: 'normal'
      });
    }
  } catch (notificationError) {
    console.error('Error creating admin notification:', notificationError);
  }

  user.password = undefined;

  res.status(200).json({
    status: 'success',
    message: isBlocked ? 'User blocked successfully' : 'User unblocked successfully',
    data: { user }
  });
});

// @desc    Activate/deactivate user
// @route   PATCH /api/admin/users/:id/activate
// @access  Private/Admin
exports.activateUser = catchAsync(async (req, res, next) => {
  const { isActive } = req.body;

  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Prevent deactivating own account
  if (user._id.toString() === req.user.id) {
    return next(new AppError('You cannot deactivate your own account', 403));
  }

  user.isActive = isActive;

  await user.save({ validateBeforeSave: false });

  // Create notification for user
  try {
    await Notification.createNotification({
      recipient: user._id,
      type: isActive ? 'user_activated' : 'user_deactivated',
      title: isActive ? 'Account Activated ✅' : 'Account Deactivated ⏸️',
      message: isActive
        ? `Hi ${user.firstName}, your account has been activated by an administrator. You can now access all features.`
        : `Hi ${user.firstName}, your account has been deactivated by an administrator. Please contact support for assistance.`,
      data: {
        userId: user._id,
        isActive: isActive,
        updatedBy: req.user.id,
        updatedAt: new Date()
      },
      link: '/dashboard/settings',
      priority: 'high'
    });
  } catch (notificationError) {
    console.error('Error creating activate/deactivate notification:', notificationError);
  }

  user.password = undefined;

  res.status(200).json({
    status: 'success',
    message: isActive ? 'User activated successfully' : 'User deactivated successfully',
    data: { user }
  });
});

// @desc    Delete user (soft delete)
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Prevent deleting own account
  if (user._id.toString() === req.user.id) {
    return next(new AppError('You cannot delete your own account', 403));
  }

  // Soft delete: Mark as inactive and set deletion date
  user.isActive = false;
  user.deletedAt = new Date();
  user.deletionReason = req.body.reason || 'Deleted by admin';

  await user.save({ validateBeforeSave: false });

  // Create notification for user
  try {
    await Notification.createNotification({
      recipient: user._id,
      type: 'user_deleted',
      title: 'Account Deleted ❌',
      message: `Hi ${user.firstName}, your account has been deleted by an administrator. Reason: ${user.deletionReason}. If you believe this is a mistake, please contact support.`,
      data: {
        userId: user._id,
        deletionReason: user.deletionReason,
        deletedAt: user.deletedAt,
        deletedBy: req.user.id
      },
      link: '/support',
      priority: 'urgent'
    });
  } catch (notificationError) {
    console.error('Error creating deletion notification:', notificationError);
  }

  // Notify all admins
  try {
    const admins = await User.find({ role: 'admin', _id: { $ne: req.user.id } });
    for (const admin of admins) {
      await Notification.createNotification({
        recipient: admin._id,
        type: 'system',
        title: 'User Deleted 🗑️',
        message: `${user.firstName} ${user.lastName} was deleted by ${req.user.firstName} ${req.user.lastName}. Reason: ${user.deletionReason}`,
        data: {
          userId: user._id,
          userName: `${user.firstName} ${user.lastName}`,
          deletionReason: user.deletionReason
        },
        link: `/dashboard/users`,
        priority: 'normal'
      });
    }
  } catch (notificationError) {
    console.error('Error creating admin notification:', notificationError);
  }

  res.status(200).json({
    status: 'success',
    message: 'User deleted successfully',
    data: null
  });
});

// @desc    Permanently delete user
// @route   DELETE /api/admin/users/:id/permanent
// @access  Private/Admin
exports.permanentlyDeleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Prevent deleting own account
  if (user._id.toString() === req.user.id) {
    return next(new AppError('You cannot delete your own account', 403));
  }

  // Prevent deleting other admins
  if (user.role === 'admin') {
    return next(new AppError('Cannot permanently delete admin accounts', 403));
  }

  await User.findByIdAndDelete(req.params.id);

  res.status(200).json({
    status: 'success',
    message: 'User permanently deleted',
    data: null
  });
});

// @desc    Reset user password
// @route   PATCH /api/admin/users/:id/reset-password
// @access  Private/Admin
exports.resetUserPassword = catchAsync(async (req, res, next) => {
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return next(new AppError('Please provide a valid password (minimum 6 characters)', 400));
  }

  const user = await User.findById(req.params.id).select('+password');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  // Create notification for user
  try {
    await Notification.createNotification({
      recipient: user._id,
      type: 'account_password_reset',
      title: 'Password Reset by Admin 🔐',
      message: `Hi ${user.firstName}, your password has been reset by an administrator. Please log in with your new password and consider changing it in your account settings.`,
      data: {
        userId: user._id,
        resetBy: req.user.id,
        resetAt: new Date()
      },
      link: '/dashboard/settings',
      priority: 'urgent'
    });
  } catch (notificationError) {
    console.error('Error creating password reset notification:', notificationError);
  }

  res.status(200).json({
    status: 'success',
    message: 'Password reset successfully'
  });
});

// @desc    Get user statistics
// @route   GET /api/admin/users/stats
// @access  Private/Admin
exports.getUserStats = catchAsync(async (req, res, next) => {
  const stats = {
    total: await User.countDocuments(),
    guests: await User.countDocuments({ role: 'guest' }),
    hosts: await User.countDocuments({ role: 'host' }),
    admins: await User.countDocuments({ role: 'admin' }),
    active: await User.countDocuments({ isActive: true }),
    inactive: await User.countDocuments({ isActive: false }),
    blocked: await User.countDocuments({ isBlocked: true }),
    verified: await User.countDocuments({ isEmailVerified: true }),
    newThisMonth: await User.countDocuments({
      createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
    })
  };

  // Get users by month for the last 12 months
  const usersByMonth = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 12)) }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats,
      usersByMonth
    }
  });
});

// @desc    Verify user email
// @route   PATCH /api/admin/users/:id/verify-email
// @access  Private/Admin
exports.verifyUserEmail = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;

  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'User email verified successfully',
    data: { user }
  });
});
