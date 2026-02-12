const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const calendarController = require('../controllers/calendarController');

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

// Serve iCal feed - no auth required (accessed by Airbnb, Booking.com, etc.)
router.get('/ical/:token.ics', calendarController.exportIcal);

// ============================================================================
// PROTECTED ROUTES (require authentication)
// ============================================================================

// Generate iCal export token for a listing
router.post('/listings/:listingId/generate-token', protect, calendarController.generateIcalToken);

// Import an external calendar (Airbnb, Booking.com, etc.)
router.post('/listings/:listingId/import', protect, calendarController.importExternalCalendar);

// Remove an imported external calendar by index
router.delete('/listings/:listingId/external/:calendarIndex', protect, calendarController.removeExternalCalendar);

// Manually re-sync all imported calendars for a listing
router.post('/listings/:listingId/sync', protect, calendarController.syncAllCalendars);

module.exports = router;
