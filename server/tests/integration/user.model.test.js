/**
 * Unit Tests for User Model
 */

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../../src/models/User');
const { connectDB, disconnectDB, clearDB } = require('../helpers/db');

describe('User Model', () => {

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await clearDB();
  });

  describe('User Creation', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'Password123@'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.firstName).toBe('Test');
      expect(savedUser.lastName).toBe('User');
      expect(savedUser.email).toBe('test@example.com');
      expect(savedUser.role).toBe('guest'); // Default role
    });

    it('should hash password before saving', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'hash@example.com',
        password: 'Password123@'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      // Password should be hashed
      expect(savedUser.password).not.toBe('Password123!');
      expect(savedUser.password.length).toBeGreaterThan(20);
    });

    it('should fail without required fields', async () => {
      const user = new User({
        firstName: 'Test'
      });

      let error;
      try {
        await user.save();
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.errors.lastName).toBeDefined();
      expect(error.errors.email).toBeDefined();
      expect(error.errors.password).toBeDefined();
    });

    it('should fail with duplicate email', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'duplicate@example.com',
        password: 'Password123@'
      };

      await User.create(userData);

      let error;
      try {
        await User.create(userData);
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.code).toBe(11000); // MongoDB duplicate key error
    });

    it('should fail with invalid email format', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'not-an-email',
        password: 'Password123@'
      };

      let error;
      try {
        await User.create(userData);
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.errors.email).toBeDefined();
    });
  });

  describe('User Methods', () => {
    it('should validate correct password', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'validate@example.com',
        password: 'Password123@'
      };

      const user = await User.create(userData);
      const isMatch = await user.comparePassword('Password123@');

      expect(isMatch).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'reject@example.com',
        password: 'Password123@'
      };

      const user = await User.create(userData);
      const isMatch = await user.comparePassword('WrongPassword@1');

      expect(isMatch).toBe(false);
    });

    it('should generate signed JWT token', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'jwt@example.com',
        password: 'Password123@'
      };

      const user = await User.create(userData);
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });
  });

  describe('User Roles', () => {
    it('should default to guest role', async () => {
      const user = await User.create({
        firstName: 'Guest',
        lastName: 'User',
        email: 'guest@example.com',
        password: 'Password123@'
      });

      expect(user.role).toBe('guest');
    });

    it('should allow host role', async () => {
      const user = await User.create({
        firstName: 'Host',
        lastName: 'User',
        email: 'host@example.com',
        password: 'Password123@',
        role: 'host'
      });

      expect(user.role).toBe('host');
    });

    it('should allow admin role', async () => {
      const user = await User.create({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        password: 'Password123@',
        role: 'admin'
      });

      expect(user.role).toBe('admin');
    });
  });

  describe('User Virtual Fields', () => {
    it('should have fullName virtual', async () => {
      const user = await User.create({
        firstName: 'John',
        lastName: 'Doe',
        email: 'virtual@example.com',
        password: 'Password123@'
      });

      expect(user.fullName).toBe('John Doe');
    });
  });

  describe('User Timestamps', () => {
    it('should have createdAt and updatedAt', async () => {
      const user = await User.create({
        firstName: 'Timestamp',
        lastName: 'User',
        email: 'timestamp@example.com',
        password: 'Password123@'
      });

      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
      expect(user.createdAt instanceof Date).toBe(true);
    });
  });
});
