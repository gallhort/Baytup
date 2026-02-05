/**
 * Standardized API Response Utility
 * Ensures consistent response format across all endpoints
 */

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {string} message - Success message
 * @param {Object} data - Response data
 */
const successResponse = (res, statusCode = 200, message = 'Success', data = null) => {
  const response = {
    success: true,
    status: 'success',
    message
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {string} message - Error message
 * @param {Array|Object} errors - Validation errors or additional error details
 */
const errorResponse = (res, statusCode = 500, message = 'Server Error', errors = null) => {
  const response = {
    success: false,
    status: 'error',
    message
  };

  if (errors !== null) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Array of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @param {string} message - Success message
 */
const paginatedResponse = (res, data, page, limit, total, message = 'Success') => {
  const totalPages = Math.ceil(total / limit);

  return res.status(200).json({
    success: true,
    status: 'success',
    message,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  });
};

/**
 * Common HTTP status codes with messages
 */
const HttpStatus = {
  OK: { code: 200, message: 'Success' },
  CREATED: { code: 201, message: 'Created successfully' },
  NO_CONTENT: { code: 204, message: 'No content' },
  BAD_REQUEST: { code: 400, message: 'Bad request' },
  UNAUTHORIZED: { code: 401, message: 'Unauthorized' },
  FORBIDDEN: { code: 403, message: 'Forbidden' },
  NOT_FOUND: { code: 404, message: 'Not found' },
  CONFLICT: { code: 409, message: 'Conflict' },
  UNPROCESSABLE: { code: 422, message: 'Unprocessable entity' },
  TOO_MANY_REQUESTS: { code: 429, message: 'Too many requests' },
  SERVER_ERROR: { code: 500, message: 'Internal server error' }
};

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse,
  HttpStatus
};
