const User = require('../models/User');
const bcrypt = require('bcryptjs');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');
const Notification = require('../models/Notification');
const { sendPasswordChangedEmail, sendEmailChangedEmail } = require('../utils/emailService');

// @desc    Get user settings
// @route   GET /api/settings
// @access  Private
const getSettings = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const user = await User.findById(userId).select('-password -emailVerificationToken -passwordResetToken');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      settings: {
        // Personal Information
        personalInfo: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          dateOfBirth: user.dateOfBirth,
          gender: user.gender,
          bio: user.bio,
          avatar: user.avatar
        },
        // Address
        address: user.address || {
          street: '',
          city: '',
          state: '',
          postalCode: '',
          country: 'Algeria'
        },
        // Preferences
        preferences: {
          language: user.language,
          currency: user.currency,
          theme: user.theme
        },
        // Notifications
        notifications: user.notifications || {
          email: {
            bookingUpdates: true,
            messages: true,
            promotions: true,
            newsletter: true
          },
          push: {
            bookingUpdates: true,
            messages: true,
            promotions: false
          }
        },
        // Privacy
        privacy: user.privacy || {
          showEmail: false,
          showPhone: false,
          profileVisibility: 'public'
        },
        // Account Status
        account: {
          isEmailVerified: user.isEmailVerified,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        }
      }
    }
  });
});

// @desc    Update personal information
// @route   PUT /api/settings/personal-info
// @access  Private
const updatePersonalInfo = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { firstName, lastName, phone, dateOfBirth, gender, bio } = req.body;

  const allowedFields = {};

  // Only add fields that are provided
  if (firstName !== undefined) allowedFields.firstName = firstName;
  if (lastName !== undefined) allowedFields.lastName = lastName;
  if (phone !== undefined) allowedFields.phone = phone || ''; // Allow empty string
  if (dateOfBirth !== undefined) allowedFields.dateOfBirth = dateOfBirth || null;
  if (gender !== undefined) allowedFields.gender = gender || ''; // Allow empty string
  if (bio !== undefined) allowedFields.bio = bio || ''; // Allow empty string

  const user = await User.findByIdAndUpdate(
    userId,
    allowedFields,
    { new: true, runValidators: false } // Disable validators for optional fields
  ).select('-password');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Personal information updated successfully',
    data: { user }
  });
});

// @desc    Update address
// @route   PUT /api/settings/address
// @access  Private
const updateAddress = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { street, city, state, postalCode, country } = req.body;

  const user = await User.findByIdAndUpdate(
    userId,
    {
      address: {
        street: street || '',
        city: city || '',
        state: state || '',
        postalCode: postalCode || '',
        country: country || 'Algeria'
      }
    },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Address updated successfully',
    data: { address: user.address }
  });
});

// @desc    Update preferences
// @route   PUT /api/settings/preferences
// @access  Private
const updatePreferences = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { language, currency, theme } = req.body;

  const updateData = {};
  if (language) updateData.language = language;
  if (currency) updateData.currency = currency;
  if (theme) updateData.theme = theme;

  const user = await User.findByIdAndUpdate(
    userId,
    updateData,
    { new: true, runValidators: true }
  ).select('language currency theme');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Preferences updated successfully',
    data: {
      preferences: {
        language: user.language,
        currency: user.currency,
        theme: user.theme
      }
    }
  });
});

// @desc    Update notification settings
// @route   PUT /api/settings/notifications
// @access  Private
const updateNotificationSettings = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { notifications } = req.body;

  const user = await User.findByIdAndUpdate(
    userId,
    { notifications },
    { new: true, runValidators: true }
  ).select('notifications');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Notification settings updated successfully',
    data: { notifications: user.notifications }
  });
});

// @desc    Update privacy settings
// @route   PUT /api/settings/privacy
// @access  Private
const updatePrivacySettings = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { privacy } = req.body;

  const user = await User.findByIdAndUpdate(
    userId,
    { privacy },
    { new: true, runValidators: true }
  ).select('privacy');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Privacy settings updated successfully',
    data: { privacy: user.privacy }
  });
});

// @desc    Change password
// @route   PUT /api/settings/password
// @access  Private
const changePassword = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { currentPassword, newPassword, confirmPassword } = req.body;

  // Validation
  if (!currentPassword || !newPassword || !confirmPassword) {
    return next(new AppError('Please provide all required fields', 400));
  }

  if (newPassword !== confirmPassword) {
    return next(new AppError('New passwords do not match', 400));
  }

  if (newPassword.length < 6) {
    return next(new AppError('Password must be at least 6 characters', 400));
  }

  // Get user with password
  const user = await User.findById(userId).select('+password');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Check if user has a password (not Google auth)
  if (!user.password) {
    return next(new AppError('Password cannot be changed for Google authenticated accounts', 400));
  }

  // Verify current password
  const isPasswordCorrect = await user.comparePassword(currentPassword);

  if (!isPasswordCorrect) {
    return next(new AppError('Current password is incorrect', 401));
  }

  // Update password
  user.password = newPassword;
  await user.save();

  // Create in-app notification and send email
  try {
    // In-app notification
    await Notification.createNotification({
      recipient: userId,
      type: 'password_changed',
      title: 'Password Changed Successfully 🔒',
      message: 'Your account password has been changed successfully. If you did not make this change, please contact support immediately.',
      data: {
        changedAt: new Date(),
        ipAddress: req.ip || 'Unknown'
      },
      link: '/dashboard/settings/security',
      priority: 'high'
    });

    // Send security email
    await sendPasswordChangedEmail(user);
  } catch (notificationError) {
    console.error('Error sending password change notifications:', notificationError);
  }

  res.status(200).json({
    status: 'success',
    message: 'Password changed successfully'
  });
});

// @desc    Change email
// @route   PUT /api/settings/email
// @access  Private
const changeEmail = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // Check if email already exists
  const emailExists = await User.findOne({ email, _id: { $ne: userId } });

  if (emailExists) {
    return next(new AppError('Email already in use', 400));
  }

  // Get user with password
  const user = await User.findById(userId).select('+password');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Verify password
  if (user.password) {
    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      return next(new AppError('Password is incorrect', 401));
    }
  }

  // Store old email before updating
  const oldEmail = user.email;

  // Update email and set verification to false
  user.email = email;
  user.isEmailVerified = false;
  await user.save();

  // Create in-app notification and send emails to both old and new addresses
  try {
    // In-app notification
    await Notification.createNotification({
      recipient: userId,
      type: 'email_changed',
      title: 'Email Address Changed 📧',
      message: `Your email address has been changed to ${email}. Please verify your new email address.`,
      data: {
        oldEmail: oldEmail,
        newEmail: email,
        changedAt: new Date(),
        requiresVerification: true
      },
      link: '/dashboard/settings/account',
      priority: 'high'
    });

    // Send email to OLD address (security alert)
    await sendEmailChangedEmail(user, oldEmail, email, true);

    // Send email to NEW address (confirmation)
    await sendEmailChangedEmail(user, oldEmail, email, false);
  } catch (notificationError) {
    console.error('Error sending email change notifications:', notificationError);
  }

  res.status(200).json({
    status: 'success',
    message: 'Email changed successfully. Please verify your new email.',
    data: {
      email: user.email,
      isEmailVerified: user.isEmailVerified
    }
  });
});

// @desc    Upload/Update avatar
// @route   POST /api/settings/avatar
// @access  Private
const uploadAvatar = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please upload an image', 400));
  }

  const userId = req.user.id;
  const avatarUrl = `/uploads/users/${req.file.filename}`;

  const user = await User.findByIdAndUpdate(
    userId,
    { avatar: avatarUrl },
    { new: true }
  ).select('avatar');

  res.status(200).json({
    status: 'success',
    message: 'Avatar uploaded successfully',
    data: {
      avatar: user.avatar,
      avatarUrl
    }
  });
});

// @desc    Delete avatar
// @route   DELETE /api/settings/avatar
// @access  Private
const deleteAvatar = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const defaultAvatar = '/uploads/users/default-avatar.png';

  const user = await User.findByIdAndUpdate(
    userId,
    { avatar: defaultAvatar },
    { new: true }
  ).select('avatar');

  res.status(200).json({
    status: 'success',
    message: 'Avatar deleted successfully',
    data: {
      avatar: user.avatar
    }
  });
});

// @desc    Deactivate account
// @route   PUT /api/settings/deactivate
// @access  Private
const deactivateAccount = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { password } = req.body;

  if (!password) {
    return next(new AppError('Please provide your password', 400));
  }

  // Get user with password
  const user = await User.findById(userId).select('+password');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Verify password if user has one
  if (user.password) {
    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      return next(new AppError('Password is incorrect', 401));
    }
  }

  // Deactivate account
  user.isActive = false;
  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'Account deactivated successfully'
  });
});

// @desc    Delete account permanently
// @route   DELETE /api/settings/account
// @access  Private
const deleteAccount = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { password, reason } = req.body;

  if (!password) {
    return next(new AppError('Please provide your password', 400));
  }

  // Get user with password
  const user = await User.findById(userId).select('+password');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Verify password if user has one
  if (user.password) {
    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      return next(new AppError('Password is incorrect', 401));
    }
  }

  // Check for active bookings
  const Booking = require('../models/Booking');
  const activeBookings = await Booking.countDocuments({
    $or: [
      { user: userId, status: { $in: ['pending', 'confirmed'] } },
      { host: userId, status: { $in: ['pending', 'confirmed'] } }
    ]
  });

  if (activeBookings > 0) {
    return next(new AppError('Cannot delete account with active bookings. Please cancel or complete your bookings first.', 400));
  }

  // Deactivate listings if host
  if (user.role === 'host') {
    const Listing = require('../models/Listing');
    await Listing.updateMany(
      { owner: userId },
      { status: 'inactive', deletedAt: new Date() }
    );
  }

  // Soft delete user
  user.isActive = false;
  user.deletedAt = new Date();
  user.deletionReason = reason || 'User requested deletion';
  await user.save();

  res.status(200).json({
    status: 'success',
    message: 'Account deleted successfully'
  });
});

module.exports = {
  getSettings,
  updatePersonalInfo,
  updateAddress,
  updatePreferences,
  updateNotificationSettings,
  updatePrivacySettings,
  changePassword,
  changeEmail,
  uploadAvatar,
  deleteAvatar,
  deactivateAccount,
  deleteAccount
};
