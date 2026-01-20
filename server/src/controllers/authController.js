const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { OAuth2Client } = require('google-auth-library');
const { sendEmailVerification, sendPasswordResetEmail, sendWelcomeEmail } = require('../utils/emailService');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// Send token response
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);

  const options = {
    expires: new Date(
      Date.now() + (parseInt(process.env.JWT_COOKIE_EXPIRE) || 30) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res.status(statusCode).cookie('token', token, options).json({
    status: 'success',
    token,
    data: {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
        language: user.language,
        currency: user.currency
      }
    }
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { firstName, lastName, email, password, role = 'guest', language = 'en', currency = 'DZD' } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User already exists with this email'
      });
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role,
      language,
      currency,
      isEmailVerified: false
    });

    // Generate email verification token
    const verificationToken = user.createEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    try {
      // Send verification email
      await sendEmailVerification(user, verificationToken);

      // Create in-app notification for user
      try {
        await Notification.createNotification({
          recipient: user._id,
          type: 'auth_register',
          title: 'Welcome to Baytup! 🎉',
          message: `Hi ${user.firstName}! Your account has been created successfully. Please verify your email to get started.`,
          data: {
            userId: user._id,
            email: user.email,
            registeredAt: new Date()
          },
          link: '/dashboard/settings',
          priority: 'high'
        });
      } catch (notificationError) {
        console.error('Error creating registration notification:', notificationError);
      }

      res.status(201).json({
        status: 'success',
        message: 'Registration successful! Please check your email to verify your account.',
        data: {
          user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            isEmailVerified: user.isEmailVerified,
            language: user.language,
            currency: user.currency
          }
        }
      });
    } catch (emailError) {
      // If email fails, still allow registration but inform user
      console.error('Email verification send failed:', emailError);

      // Create in-app notification even if email fails
      try {
        await Notification.createNotification({
          recipient: user._id,
          type: 'auth_register',
          title: 'Welcome to Baytup! 🎉',
          message: `Hi ${user.firstName}! Your account has been created successfully. Email verification failed - please request a new verification email.`,
          data: {
            userId: user._id,
            email: user.email,
            registeredAt: new Date(),
            emailFailed: true
          },
          link: '/dashboard/settings',
          priority: 'high'
        });
      } catch (notificationError) {
        console.error('Error creating registration notification:', notificationError);
      }

      res.status(201).json({
        status: 'success',
        message: 'Registration successful! However, we could not send the verification email. Please try requesting a new verification email.',
        data: {
          user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            isEmailVerified: user.isEmailVerified,
            language: user.language,
            currency: user.currency
          }
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(401).json({
        status: 'error',
        message: 'Please verify your email before logging in. Check your inbox for the verification email.',
        needsVerification: true,
        email: user.email
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Create in-app notification for successful login
    try {
      await Notification.createNotification({
        recipient: user._id,
        type: 'auth_login',
        title: 'Welcome back! 👋',
        message: `Hi ${user.firstName}! You've successfully logged in to your Baytup account.`,
        data: {
          userId: user._id,
          loginAt: new Date(),
          ipAddress: req.ip || req.connection.remoteAddress
        },
        link: '/dashboard',
        priority: 'normal'
      });
    } catch (notificationError) {
      console.error('Error creating login notification:', notificationError);
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Google OAuth login
// @route   POST /api/auth/google
// @access  Public
const googleAuth = async (req, res, next) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        status: 'error',
        message: 'Google credential is required'
      });
    }

    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, given_name: firstName, family_name: lastName, picture } = payload;

    // Check if user exists
    let user = await User.findOne({ $or: [{ email }, { googleId }] });

    if (user) {
      // Update existing user
      if (!user.googleId) {
        user.googleId = googleId;
      }
      if (!user.avatar || user.avatar === '/uploads/users/default-avatar.png') {
        user.avatar = picture;
      }
      user.isEmailVerified = true;
      user.lastLogin = new Date();
      await user.save({ validateBeforeSave: false });
    } else {
      // Create new user
      user = await User.create({
        firstName: firstName || 'User',
        lastName: lastName || '',
        email,
        googleId,
        avatar: picture || '/uploads/users/default-avatar.png',
        isEmailVerified: true,
        lastLogin: new Date()
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Google auth error:', error);
    return res.status(400).json({
      status: 'error',
      message: 'Google authentication failed'
    });
  }
};

// @desc    Logout user / clear cookie
// @route   GET /api/auth/logout
// @access  Private
const logout = async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully'
  });
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate([
      { path: 'stats' }
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
// @access  Private
const updateDetails = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phone: req.body.phone,
      bio: req.body.bio,
      dateOfBirth: req.body.dateOfBirth,
      gender: req.body.gender,
      language: req.body.language,
      currency: req.body.currency,
      address: req.body.address
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(key => {
      if (fieldsToUpdate[key] === undefined) {
        delete fieldsToUpdate[key];
      }
    });

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
const updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    if (!(await user.comparePassword(req.body.currentPassword))) {
      return res.status(401).json({
        status: 'error',
        message: 'Current password is incorrect'
      });
    }

    user.password = req.body.newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'No user found with this email'
      });
    }

    // Get reset token
    const resetToken = user.createPasswordResetToken();

    await user.save({ validateBeforeSave: false });

    try {
      // Send password reset email
      await sendPasswordResetEmail(user, resetToken);

      // Create in-app notification for password reset request
      try {
        await Notification.createNotification({
          recipient: user._id,
          type: 'auth_forgot_password',
          title: 'Password Reset Requested 🔐',
          message: `Hi ${user.firstName}! We received a request to reset your password. Please check your email for the reset link.`,
          data: {
            userId: user._id,
            requestedAt: new Date()
          },
          link: '/dashboard/settings',
          priority: 'high'
        });
      } catch (notificationError) {
        console.error('Error creating forgot password notification:', notificationError);
      }

      res.status(200).json({
        status: 'success',
        message: 'Password reset email sent successfully. Please check your email.'
      });
    } catch (emailError) {
      console.error('Password reset email send failed:', emailError);

      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        status: 'error',
        message: 'Password reset email could not be sent. Please try again later.'
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: resetPasswordToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired reset token'
      });
    }

    // Set new password
    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Create in-app notification for password reset success
    try {
      await Notification.createNotification({
        recipient: user._id,
        type: 'auth_reset_password',
        title: 'Password Reset Successful ✅',
        message: `Hi ${user.firstName}! Your password has been successfully reset. You can now log in with your new password.`,
        data: {
          userId: user._id,
          resetAt: new Date()
        },
        link: '/dashboard/settings',
        priority: 'high'
      });
    } catch (notificationError) {
      console.error('Error creating reset password notification:', notificationError);
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
const verifyEmail = async (req, res, next) => {
  try {
    // Get hashed token
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    // First check if a user has this token
    let user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    });

    // If no user found with valid token, check if it's because they're already verified
    if (!user) {
      // Try to find a user who might have had this token but is already verified
      // This is a fallback - in production you might want to track used tokens separately
      const allUsers = await User.find({ isEmailVerified: true }).limit(100);

      // Check if any recently verified user might be trying to re-verify
      const recentlyVerifiedUser = allUsers.find(u => {
        // Check if user was verified in the last 24 hours
        const verifiedRecently = u.updatedAt && (Date.now() - new Date(u.updatedAt).getTime()) < 24 * 60 * 60 * 1000;
        return verifiedRecently;
      });

      if (recentlyVerifiedUser) {
        return res.status(200).json({
          status: 'already_verified',
          message: 'Your email has already been verified. You can sign in to your account.',
          data: {
            alreadyVerified: true,
            user: {
              email: recentlyVerifiedUser.email,
              firstName: recentlyVerifiedUser.firstName,
              isEmailVerified: true
            }
          }
        });
      }

      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired verification token'
      });
    }

    // Update user
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    // Send welcome email
    try {
      await sendWelcomeEmail(user);
    } catch (emailError) {
      console.error('Welcome email send failed:', emailError);
      // Don't fail the verification if welcome email fails
    }

    // Create in-app notification for email verification success
    try {
      await Notification.createNotification({
        recipient: user._id,
        type: 'auth_verify_email',
        title: 'Email Verified Successfully! 🎉',
        message: `Hi ${user.firstName}! Your email has been verified. Welcome to Baytup! You can now access all features of your account.`,
        data: {
          userId: user._id,
          email: user.email,
          verifiedAt: new Date()
        },
        link: '/dashboard',
        priority: 'high'
      });

      // Send welcome notification
      await Notification.createNotification({
        recipient: user._id,
        type: 'auth_welcome',
        title: 'Welcome to Baytup! 🏠',
        message: `Hi ${user.firstName}! We're excited to have you on board. Start exploring amazing properties or list your own to earn money!`,
        data: {
          userId: user._id,
          joinedAt: new Date()
        },
        link: '/dashboard',
        priority: 'normal'
      });
    } catch (notificationError) {
      console.error('Error creating email verification notification:', notificationError);
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Resend email verification
// @route   POST /api/auth/resend-verification
// @access  Public
const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'No user found with this email'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        status: 'error',
        message: 'Email is already verified'
      });
    }

    // Generate new verification token
    const verificationToken = user.createEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    try {
      // Send verification email
      await sendEmailVerification(user, verificationToken);

      res.status(200).json({
        status: 'success',
        message: 'Verification email sent successfully. Please check your email.'
      });
    } catch (emailError) {
      console.error('Email verification resend failed:', emailError);

      return res.status(500).json({
        status: 'error',
        message: 'Verification email could not be sent. Please try again later.'
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  googleAuth,
  logout,
  getMe,
  updateDetails,
  updatePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
};