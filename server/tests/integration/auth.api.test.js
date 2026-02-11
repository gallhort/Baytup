/**
 * Integration Tests for Auth API
 */

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../../src/models/User');
const { connectDB, disconnectDB, clearDB } = require('../helpers/db');

// Helper to generate JWT token (same as booking tests)
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// Create a minimal express app for testing
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Import routes
  const authRoutes = require('../../src/routes/auth');
  app.use('/api/auth', authRoutes);

  // Error handler
  app.use((err, req, res, next) => {
    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Server Error'
    });
  });

  return app;
};

describe('Auth API Integration Tests', () => {
  let app;

  beforeAll(async () => {
    await connectDB();
    app = createTestApp();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await clearDB();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Integration',
          lastName: 'Test',
          email: 'integration@test.com',
          password: 'Password123@'
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe('integration@test.com');
    });

    it('should return validation error for missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Test'
        });

      expect(res.status).toBe(400);
    });

    it('should return validation error for weak password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'weak@test.com',
          password: 'weak'
        });

      expect(res.status).toBe(400);
    });

    it('should return validation error for invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'not-an-email',
          password: 'Password123@'
        });

      expect(res.status).toBe(400);
    });

    it('should prevent duplicate email registration', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'First',
          lastName: 'User',
          email: 'duplicate@test.com',
          password: 'Password123@'
        });

      // Second registration with same email
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Second',
          lastName: 'User',
          email: 'duplicate@test.com',
          password: 'Password123@'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user directly in DB
      await User.create({
        firstName: 'Login',
        lastName: 'Test',
        email: 'login@test.com',
        password: 'Password123@',
        isEmailVerified: true
      });
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'Password123@'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.token).toBeDefined();
    });

    it('should return error for wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com',
          password: 'WrongPassword@1'
        });

      expect(res.status).toBe(401);
    });

    it('should return error for non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'Password123@'
        });

      expect(res.status).toBe(401);
    });

    it('should return validation error for missing email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'Password123@'
        });

      expect(res.status).toBe(400);
    });

    it('should return validation error for missing password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test.com'
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/auth/me', () => {
    let token;

    beforeEach(async () => {
      // Create a test user and generate token using helper
      const user = await User.create({
        firstName: 'Me',
        lastName: 'Test',
        email: 'me@test.com',
        password: 'Password123@',
        isEmailVerified: true
      });
      token = generateToken(user._id);
    });

    it('should return current user with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user.email).toBe('me@test.com');
    });

    it('should return error without token', async () => {
      const res = await request(app)
        .get('/api/auth/me');

      expect(res.status).toBe(401);
    });

    it('should return error with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/test', () => {
    it('should return success message', async () => {
      const res = await request(app)
        .get('/api/auth/test');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Auth routes working');
    });
  });
});
