/**
 * Jest Test Setup
 * This file runs before all tests
 */

// Increase timeout for async operations
jest.setTimeout(30000);

// Mock environment variables for testing
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-do-not-use-in-production';
process.env.JWT_EXPIRE = '1h';
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/baytup-test';
