/**
 * Unit Tests for Validation Utilities
 */

const { validationResult } = require('express-validator');
const {
  registerValidation,
  loginValidation,
  createBookingValidation,
  createReviewValidation,
  sendMessageValidation,
  mongoIdValidation,
  validate
} = require('../../src/utils/validation');

// Helper to run validation
const runValidation = async (validations, data, params = {}) => {
  const req = {
    body: data,
    params,
    query: {}
  };
  const res = {};

  for (const validation of validations) {
    await validation.run(req);
  }

  return validationResult(req);
};

describe('Validation Utilities', () => {

  describe('registerValidation', () => {
    it('should pass with valid registration data', async () => {
      const validData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Password123@'  // Using @ which is in the allowed special chars
      };

      const result = await runValidation(registerValidation, validData);
      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with short first name', async () => {
      const invalidData = {
        firstName: 'J',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Password123@'
      };

      const result = await runValidation(registerValidation, invalidData);
      expect(result.isEmpty()).toBe(false);
      expect(result.array()[0].path).toBe('firstName');
    });

    it('should fail with invalid email', async () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'not-an-email',
        password: 'Password123@'
      };

      const result = await runValidation(registerValidation, invalidData);
      expect(result.isEmpty()).toBe(false);
    });

    it('should fail with weak password (no uppercase)', async () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123@'
      };

      const result = await runValidation(registerValidation, invalidData);
      expect(result.isEmpty()).toBe(false);
    });

    it('should fail with weak password (no special character)', async () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Password123'
      };

      const result = await runValidation(registerValidation, invalidData);
      expect(result.isEmpty()).toBe(false);
    });

    it('should accept French characters in names', async () => {
      const validData = {
        firstName: 'Jean-Pierre',
        lastName: "D'Artagnan",
        email: 'jean@example.com',
        password: 'Password123@'
      };

      const result = await runValidation(registerValidation, validData);
      expect(result.isEmpty()).toBe(true);
    });

    it('should accept Arabic names', async () => {
      const validData = {
        firstName: 'Ahmed',
        lastName: 'Benali',
        email: 'ahmed@example.com',
        password: 'Password123@'
      };

      const result = await runValidation(registerValidation, validData);
      expect(result.isEmpty()).toBe(true);
    });
  });

  describe('loginValidation', () => {
    it('should pass with valid credentials', async () => {
      const validData = {
        email: 'user@example.com',
        password: 'anypassword'
      };

      const result = await runValidation(loginValidation, validData);
      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with missing password', async () => {
      const invalidData = {
        email: 'user@example.com'
      };

      const result = await runValidation(loginValidation, invalidData);
      expect(result.isEmpty()).toBe(false);
    });
  });

  describe('createBookingValidation', () => {
    it('should pass with valid booking data', async () => {
      const validData = {
        listing: '507f1f77bcf86cd799439011',
        startDate: '2026-03-01',
        endDate: '2026-03-05',
        guestCount: { adults: 2, children: 1 }
      };

      const result = await runValidation(createBookingValidation, validData);
      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with invalid listing ID', async () => {
      const invalidData = {
        listing: 'not-a-valid-id',
        startDate: '2026-03-01',
        endDate: '2026-03-05',
        guestCount: { adults: 2 }
      };

      const result = await runValidation(createBookingValidation, invalidData);
      expect(result.isEmpty()).toBe(false);
    });

    it('should fail with zero adults', async () => {
      const invalidData = {
        listing: '507f1f77bcf86cd799439011',
        startDate: '2026-03-01',
        endDate: '2026-03-05',
        guestCount: { adults: 0 }
      };

      const result = await runValidation(createBookingValidation, invalidData);
      expect(result.isEmpty()).toBe(false);
    });

    it('should fail with invalid date format', async () => {
      const invalidData = {
        listing: '507f1f77bcf86cd799439011',
        startDate: 'not-a-date',
        endDate: '2026-03-05',
        guestCount: { adults: 2 }
      };

      const result = await runValidation(createBookingValidation, invalidData);
      expect(result.isEmpty()).toBe(false);
    });
  });

  describe('createReviewValidation', () => {
    it('should pass with valid review data', async () => {
      const validData = {
        booking: '507f1f77bcf86cd799439011',
        rating: { overall: 5 },
        comment: 'Great experience! Would definitely recommend.'
      };

      const result = await runValidation(createReviewValidation, validData);
      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with rating out of range', async () => {
      const invalidData = {
        booking: '507f1f77bcf86cd799439011',
        rating: { overall: 6 },
        comment: 'Great experience!'
      };

      const result = await runValidation(createReviewValidation, invalidData);
      expect(result.isEmpty()).toBe(false);
    });

    it('should fail with comment too short', async () => {
      const invalidData = {
        booking: '507f1f77bcf86cd799439011',
        rating: { overall: 5 },
        comment: 'Good'
      };

      const result = await runValidation(createReviewValidation, invalidData);
      expect(result.isEmpty()).toBe(false);
    });
  });

  describe('sendMessageValidation', () => {
    it('should pass with valid message', async () => {
      const validData = {
        conversation: '507f1f77bcf86cd799439011',
        content: 'Hello, I have a question about the listing.'
      };

      const result = await runValidation(sendMessageValidation, validData);
      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with empty content', async () => {
      const invalidData = {
        conversation: '507f1f77bcf86cd799439011',
        content: ''
      };

      const result = await runValidation(sendMessageValidation, invalidData);
      expect(result.isEmpty()).toBe(false);
    });

    it('should fail with content too long', async () => {
      const invalidData = {
        conversation: '507f1f77bcf86cd799439011',
        content: 'a'.repeat(2001)
      };

      const result = await runValidation(sendMessageValidation, invalidData);
      expect(result.isEmpty()).toBe(false);
    });
  });

  describe('mongoIdValidation', () => {
    it('should pass with valid MongoDB ObjectId', async () => {
      const req = {
        body: {},
        params: { id: '507f1f77bcf86cd799439011' },
        query: {}
      };

      for (const validation of mongoIdValidation) {
        await validation.run(req);
      }

      const result = validationResult(req);
      expect(result.isEmpty()).toBe(true);
    });

    it('should fail with invalid MongoDB ObjectId', async () => {
      const req = {
        body: {},
        params: { id: 'invalid-id' },
        query: {}
      };

      for (const validation of mongoIdValidation) {
        await validation.run(req);
      }

      const result = validationResult(req);
      expect(result.isEmpty()).toBe(false);
    });
  });

  describe('validate middleware', () => {
    it('should call next() when no validation errors', () => {
      const req = {
        body: {},
        params: {},
        query: {},
        [Symbol.for('express-validator#contexts')]: []
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      // Mock validationResult to return empty errors
      validate(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
