/**
 * Integration Tests for Booking API
 * Tests booking lifecycle, payment, and cancellation flows
 */

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Helper to generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// Mock dependencies
jest.mock('../../src/services/stripeService', () => ({
  createPaymentIntent: jest.fn().mockResolvedValue({
    clientSecret: 'pi_test_secret',
    paymentIntentId: 'pi_test_123'
  }),
  getPaymentIntent: jest.fn().mockResolvedValue({ status: 'succeeded' })
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' })
  })
}));

// Models
const User = require('../../src/models/User');
const Listing = require('../../src/models/Listing');
const Booking = require('../../src/models/Booking');

// Test helpers
const { connectDB, disconnectDB, clearDB } = require('../helpers/db');

describe('Booking API Integration Tests', () => {
  let app;
  let guestToken;
  let hostToken;
  let testListing;
  let testGuest;
  let testHost;

  // Create test app
  const createTestApp = () => {
    const testApp = express();
    testApp.use(express.json());

    const bookingRoutes = require('../../src/routes/bookings');
    testApp.use('/api/bookings', bookingRoutes);

    testApp.use((err, req, res, next) => {
      res.status(err.statusCode || 500).json({
        success: false,
        message: err.message
      });
    });

    return testApp;
  };

  beforeAll(async () => {
    await connectDB();
    app = createTestApp();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await clearDB();

    // Create test host
    testHost = await User.create({
      firstName: 'Host',
      lastName: 'User',
      email: 'host@test.com',
      password: 'Password123@',
      role: 'host',
      isEmailVerified: true
    });
    hostToken = generateToken(testHost._id);

    // Create test guest
    testGuest = await User.create({
      firstName: 'Guest',
      lastName: 'User',
      email: 'guest@test.com',
      password: 'Password123@',
      role: 'guest',
      isEmailVerified: true
    });
    guestToken = generateToken(testGuest._id);

    // Create test listing
    testListing = await Listing.create({
      title: 'Test Apartment',
      description: 'A beautiful test apartment for testing purposes',
      host: testHost._id,
      category: 'stay',
      subcategory: 'apartment',
      address: {
        street: '123 Test Street',
        city: 'Algiers',
        state: 'Algiers',
        country: 'Algeria'
      },
      location: {
        type: 'Point',
        coordinates: [3.0588, 36.7538]
      },
      pricing: {
        basePrice: 5000,
        cleaningFee: 1000,
        currency: 'DZD',
        pricingType: 'per_night'
      },
      capacity: {
        guests: 4,
        bedrooms: 2,
        beds: 2,
        bathrooms: 1
      },
      status: 'active',
      cancellationPolicy: 'flexible'
    });
  });

  describe('GET /api/bookings/guest', () => {
    it('should return empty array for new guest', async () => {
      const res = await request(app)
        .get('/api/bookings/guest')
        .set('Authorization', `Bearer ${guestToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.bookings).toEqual([]);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .get('/api/bookings/guest');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/bookings', () => {
    it('should create a new booking', async () => {
      const bookingData = {
        listing: testListing._id.toString(),
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        guestCount: {
          adults: 2,
          children: 0,
          infants: 0
        }
      };

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${guestToken}`)
        .send(bookingData);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.booking).toBeDefined();
      expect(res.body.data.booking.status).toBe('pending');
    });

    it('should reject booking with invalid listing ID', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({
          listing: 'invalid-id',
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          guestCount: { adults: 1 }
        });

      expect(res.status).toBe(400);
    });

    it('should reject booking with zero adults', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({
          listing: testListing._id.toString(),
          startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          guestCount: { adults: 0 }
        });

      expect(res.status).toBe(400);
    });

    it('should calculate correct pricing', async () => {
      const startDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const endDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 3 nights

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${guestToken}`)
        .send({
          listing: testListing._id.toString(),
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          guestCount: { adults: 2 }
        });

      if (res.status === 201) {
        const booking = res.body.data.booking;
        // basePrice is per-night (5000), subtotal = 3 * 5000 = 15000
        expect(booking.pricing.basePrice).toBe(5000);
        expect(booking.pricing.subtotal).toBe(15000);
        expect(booking.pricing.cleaningFee).toBe(1000);
      }
    });
  });

  describe('GET /api/bookings/:id', () => {
    let testBooking;

    beforeEach(async () => {
      testBooking = await Booking.create({
        listing: testListing._id,
        guest: testGuest._id,
        host: testHost._id,
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        guestCount: { adults: 2, children: 0, infants: 0 },
        pricing: {
          basePrice: 5000,
          nights: 3,
          subtotal: 15000,
          cleaningFee: 1000,
          serviceFee: 1200,
          totalAmount: 17200,
          currency: 'DZD'
        },
        payment: { method: 'card', status: 'pending' },
        status: 'pending'
      });
    });

    it('should return booking for guest', async () => {
      const res = await request(app)
        .get(`/api/bookings/${testBooking._id}`)
        .set('Authorization', `Bearer ${guestToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.booking._id.toString()).toBe(testBooking._id.toString());
    });

    it('should return booking for host', async () => {
      const res = await request(app)
        .get(`/api/bookings/${testBooking._id}`)
        .set('Authorization', `Bearer ${hostToken}`);

      expect(res.status).toBe(200);
    });

    it('should reject access for unrelated user', async () => {
      const otherUser = await User.create({
        firstName: 'Other',
        lastName: 'User',
        email: 'other@test.com',
        password: 'Password123@',
        isEmailVerified: true
      });
      const otherToken = generateToken(otherUser._id);

      const res = await request(app)
        .get(`/api/bookings/${testBooking._id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 400 for invalid ID format', async () => {
      const res = await request(app)
        .get('/api/bookings/invalid-id')
        .set('Authorization', `Bearer ${guestToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/bookings/:id/status', () => {
    let testBooking;

    beforeEach(async () => {
      testBooking = await Booking.create({
        listing: testListing._id,
        guest: testGuest._id,
        host: testHost._id,
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        guestCount: { adults: 2 },
        pricing: {
          basePrice: 5000,
          nights: 3,
          subtotal: 15000,
          cleaningFee: 1000,
          serviceFee: 1200,
          totalAmount: 17200,
          currency: 'DZD'
        },
        status: 'pending',
        payment: { method: 'card', status: 'paid', paidAmount: 17200 }
      });
    });

    it('should allow host to confirm booking', async () => {
      const res = await request(app)
        .patch(`/api/bookings/${testBooking._id}/status`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ status: 'confirmed' });

      expect(res.status).toBe(200);
      expect(res.body.data.booking.status).toBe('confirmed');
    });

    it('should allow host to reject booking with reason', async () => {
      const res = await request(app)
        .patch(`/api/bookings/${testBooking._id}/status`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({
          status: 'cancelled_by_host',
          hostMessage: 'Dates not available'
        });

      expect(res.status).toBe(200);
    });

    it('should reject invalid status', async () => {
      const res = await request(app)
        .patch(`/api/bookings/${testBooking._id}/status`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ status: 'invalid_status' });

      expect(res.status).toBe(400);
    });

    it('should not allow guest to change status', async () => {
      const res = await request(app)
        .patch(`/api/bookings/${testBooking._id}/status`)
        .set('Authorization', `Bearer ${guestToken}`)
        .send({ status: 'confirmed' });

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/bookings/:id/cancel', () => {
    let testBooking;

    beforeEach(async () => {
      testBooking = await Booking.create({
        listing: testListing._id,
        guest: testGuest._id,
        host: testHost._id,
        startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        endDate: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000),
        guestCount: { adults: 2 },
        pricing: {
          basePrice: 5000,
          nights: 3,
          subtotal: 15000,
          cleaningFee: 1000,
          serviceFee: 1200,
          totalAmount: 17200,
          currency: 'DZD'
        },
        status: 'confirmed',
        payment: { method: 'card', status: 'paid', paidAmount: 17200 }
      });
    });

    it('should allow guest to cancel booking', async () => {
      const res = await request(app)
        .patch(`/api/bookings/${testBooking._id}/cancel`)
        .set('Authorization', `Bearer ${guestToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.booking.status).toBe('cancelled_by_guest');
    });

    it('should allow host to cancel booking', async () => {
      const res = await request(app)
        .patch(`/api/bookings/${testBooking._id}/cancel`)
        .set('Authorization', `Bearer ${hostToken}`);

      expect(res.status).toBe(200);
    });

    it('should not cancel already cancelled booking', async () => {
      testBooking.status = 'cancelled_by_guest';
      await testBooking.save();

      const res = await request(app)
        .patch(`/api/bookings/${testBooking._id}/cancel`)
        .set('Authorization', `Bearer ${guestToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/bookings/stats', () => {
    beforeEach(async () => {
      // Create multiple bookings with _skipDateValidation for test data
      const booking1 = new Booking({
        listing: testListing._id,
        guest: testGuest._id,
        host: testHost._id,
        startDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        guestCount: { adults: 1 },
        pricing: { basePrice: 5000, nights: 3, subtotal: 15000, totalAmount: 10000, currency: 'DZD' },
        payment: { method: 'card', status: 'paid' },
        status: 'completed'
      });
      booking1._skipDateValidation = true;
      await booking1.save({ validateModifiedOnly: true });

      const booking2 = new Booking({
        listing: testListing._id,
        guest: testGuest._id,
        host: testHost._id,
        startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        guestCount: { adults: 2 },
        pricing: { basePrice: 5000, nights: 3, subtotal: 15000, totalAmount: 15000, currency: 'DZD' },
        payment: { method: 'card', status: 'paid' },
        status: 'confirmed'
      });
      await booking2.save();
    });

    it('should return booking statistics', async () => {
      const res = await request(app)
        .get('/api/bookings/stats')
        .set('Authorization', `Bearer ${guestToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('stats');
      expect(res.body.data).toHaveProperty('summary');
    });
  });

  describe('GET /api/bookings/host', () => {
    beforeEach(async () => {
      await Booking.create({
        listing: testListing._id,
        guest: testGuest._id,
        host: testHost._id,
        startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        guestCount: { adults: 1 },
        pricing: { basePrice: 5000, nights: 3, subtotal: 15000, totalAmount: 10000, currency: 'DZD' },
        payment: { method: 'card', status: 'pending' },
        status: 'pending'
      });
    });

    it('should return bookings for host', async () => {
      const res = await request(app)
        .get('/api/bookings/host')
        .set('Authorization', `Bearer ${hostToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.bookings.length).toBeGreaterThan(0);
    });

    it('should return empty for user who is not host', async () => {
      const res = await request(app)
        .get('/api/bookings/host')
        .set('Authorization', `Bearer ${guestToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.bookings).toEqual([]);
    });
  });
});
