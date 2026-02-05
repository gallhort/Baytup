/**
 * Unit Tests for API Response Utility
 */

const {
  successResponse,
  errorResponse,
  paginatedResponse,
  HttpStatus
} = require('../../src/utils/apiResponse');

describe('API Response Utility', () => {

  describe('successResponse', () => {
    it('should return success response with default values', () => {
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      successResponse(res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        status: 'success',
        message: 'Success'
      });
    });

    it('should return success response with custom data', () => {
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      successResponse(res, 201, 'Created successfully', { id: '123' });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        status: 'success',
        message: 'Created successfully',
        data: { id: '123' }
      });
    });

    it('should not include data field when data is null', () => {
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      successResponse(res, 200, 'No content', null);

      const response = res.json.mock.calls[0][0];
      expect(response.data).toBeUndefined();
    });
  });

  describe('errorResponse', () => {
    it('should return error response with default values', () => {
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      errorResponse(res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        status: 'error',
        message: 'Server Error'
      });
    });

    it('should return error response with custom message', () => {
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      errorResponse(res, 404, 'Resource not found');

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        status: 'error',
        message: 'Resource not found'
      });
    });

    it('should include validation errors when provided', () => {
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const errors = [
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Password too short' }
      ];

      errorResponse(res, 400, 'Validation failed', errors);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        status: 'error',
        message: 'Validation failed',
        errors
      });
    });
  });

  describe('paginatedResponse', () => {
    it('should return paginated response', () => {
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const data = [{ id: 1 }, { id: 2 }];
      paginatedResponse(res, data, 1, 10, 25);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        status: 'success',
        message: 'Success',
        data,
        pagination: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3,
          hasNextPage: true,
          hasPrevPage: false
        }
      });
    });

    it('should calculate pagination correctly for last page', () => {
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const data = [{ id: 21 }, { id: 22 }];
      paginatedResponse(res, data, 3, 10, 22);

      const response = res.json.mock.calls[0][0];
      expect(response.pagination.totalPages).toBe(3);
      expect(response.pagination.hasNextPage).toBe(false);
      expect(response.pagination.hasPrevPage).toBe(true);
    });

    it('should handle single page correctly', () => {
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const data = [{ id: 1 }];
      paginatedResponse(res, data, 1, 10, 1);

      const response = res.json.mock.calls[0][0];
      expect(response.pagination.totalPages).toBe(1);
      expect(response.pagination.hasNextPage).toBe(false);
      expect(response.pagination.hasPrevPage).toBe(false);
    });
  });

  describe('HttpStatus', () => {
    it('should have correct status codes', () => {
      expect(HttpStatus.OK.code).toBe(200);
      expect(HttpStatus.CREATED.code).toBe(201);
      expect(HttpStatus.BAD_REQUEST.code).toBe(400);
      expect(HttpStatus.UNAUTHORIZED.code).toBe(401);
      expect(HttpStatus.FORBIDDEN.code).toBe(403);
      expect(HttpStatus.NOT_FOUND.code).toBe(404);
      expect(HttpStatus.SERVER_ERROR.code).toBe(500);
    });

    it('should have messages for all status codes', () => {
      Object.values(HttpStatus).forEach(status => {
        expect(status.message).toBeDefined();
        expect(typeof status.message).toBe('string');
      });
    });
  });
});
