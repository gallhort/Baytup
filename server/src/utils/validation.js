const { body, query, param } = require('express-validator');

// Auth validation rules
const registerValidation = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens and apostrophes'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens and apostrophes'),
  body('email')
    .trim()
    .isLength({ max: 100 })
    .withMessage('Email cannot exceed 100 characters')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
    .custom((value) => {
      if (/\s/.test(value)) {
        throw new Error('Email cannot contain spaces');
      }
      return true;
    }),
  body('password')
    .isLength({ min: 8, max: 100 })
    .withMessage('Password must be between 8 and 100 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .matches(/[@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/)
    .withMessage('Password must contain at least one special character')
    .custom((value) => {
      if (/\s/.test(value)) {
        throw new Error('Password cannot contain spaces');
      }
      return true;
    }),
  body('role')
    .optional()
    .isIn(['guest', 'host'])
    .withMessage('Role must be either guest or host'),
  body('language')
    .optional()
    .isIn(['en', 'fr', 'ar'])
    .withMessage('Language must be en, fr, or ar'),
  body('currency')
    .optional()
    .isIn(['DZD', 'EUR'])
    .withMessage('Currency must be DZD or EUR')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const updatePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
];

const resetPasswordValidation = [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
];

// Listing validation rules
const createListingValidation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),
  body('category')
    .isIn(['stay', 'vehicle'])
    .withMessage('Category must be stay or vehicle'),
  body('subcategory')
    .trim()
    .notEmpty()
    .withMessage('Subcategory is required'),
  body('address.street')
    .trim()
    .notEmpty()
    .withMessage('Street address is required'),
  body('address.city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  body('address.state')
    .trim()
    .notEmpty()
    .withMessage('State is required'),
  body('location.coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be an array of [longitude, latitude]'),
  body('pricing.basePrice')
    .isFloat({ min: 0 })
    .withMessage('Base price must be a positive number'),
  body('pricing.currency')
    .isIn(['DZD', 'EUR'])
    .withMessage('Currency must be DZD or EUR'),
  body('pricing.pricingType')
    .isIn(['per_night', 'per_day', 'per_week', 'per_month', 'per_hour'])
    .withMessage('Invalid pricing type')
];

const updateListingValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),
  body('pricing.basePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Base price must be a positive number')
];

// Booking validation rules
const createBookingValidation = [
  body('listing')
    .isMongoId()
    .withMessage('Valid listing ID is required'),
  body('startDate')
    .isISO8601()
    .withMessage('Valid start date is required'),
  body('endDate')
    .isISO8601()
    .withMessage('Valid end date is required'),
  body('guestCount.adults')
    .isInt({ min: 1 })
    .withMessage('At least 1 adult is required'),
  body('guestCount.children')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Children count must be a positive number'),
  body('guestCount.infants')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Infants count must be a positive number')
];

// Review validation rules
const createReviewValidation = [
  body('booking')
    .isMongoId()
    .withMessage('Valid booking ID is required'),
  body('rating.overall')
    .isInt({ min: 1, max: 5 })
    .withMessage('Overall rating must be between 1 and 5'),
  body('comment')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Comment must be between 10 and 1000 characters'),
  body('title')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Title cannot exceed 100 characters')
];

// Message validation rules
const sendMessageValidation = [
  body('conversation')
    .optional()
    .isMongoId()
    .withMessage('Valid conversation ID required'),
  body('recipient')
    .optional()
    .isMongoId()
    .withMessage('Valid recipient ID required'),
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message content must be between 1 and 2000 characters'),
  body('type')
    .optional()
    .isIn(['text', 'image', 'file'])
    .withMessage('Message type must be text, image, or file')
];

// Search validation rules
const searchValidation = [
  query('location')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Location cannot be empty'),
  query('category')
    .optional()
    .isIn(['stay', 'vehicle'])
    .withMessage('Invalid category'),
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be a positive number'),
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be a positive number'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  query('guests')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Guests must be at least 1'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

// Param validation rules
const mongoIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format')
];

module.exports = {
  // Auth
  registerValidation,
  loginValidation,
  updatePasswordValidation,
  forgotPasswordValidation,
  resetPasswordValidation,

  // Listing
  createListingValidation,
  updateListingValidation,

  // Booking
  createBookingValidation,

  // Review
  createReviewValidation,

  // Message
  sendMessageValidation,

  // Search
  searchValidation,

  // Common
  mongoIdValidation
};