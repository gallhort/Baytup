const crypto = require('crypto');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const Listing = require('../models/Listing');
const Booking = require('../models/Booking');

/**
 * Simple iCal parser - extracts VEVENT blocks and their DTSTART/DTEND dates.
 * Handles VALUE=DATE (all-day) and DATETIME formats.
 * Does not depend on any external library.
 */
function parseIcalData(icalText) {
  const events = [];
  // Unfold iCal lines (lines that start with space/tab are continuations)
  const unfolded = icalText.replace(/\r\n[ \t]/g, '').replace(/\r/g, '');
  const lines = unfolded.split('\n');

  let inEvent = false;
  let currentEvent = {};

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {};
      continue;
    }

    if (trimmed === 'END:VEVENT') {
      inEvent = false;
      if (currentEvent.dtstart) {
        events.push({
          dtstart: currentEvent.dtstart,
          dtend: currentEvent.dtend || currentEvent.dtstart,
          summary: currentEvent.summary || '',
          uid: currentEvent.uid || ''
        });
      }
      currentEvent = {};
      continue;
    }

    if (!inEvent) continue;

    // Parse DTSTART
    if (trimmed.startsWith('DTSTART')) {
      currentEvent.dtstart = parseIcalDate(trimmed);
    }
    // Parse DTEND
    else if (trimmed.startsWith('DTEND')) {
      currentEvent.dtend = parseIcalDate(trimmed);
    }
    // Parse SUMMARY
    else if (trimmed.startsWith('SUMMARY')) {
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex !== -1) {
        currentEvent.summary = trimmed.substring(colonIndex + 1).trim();
      }
    }
    // Parse UID
    else if (trimmed.startsWith('UID')) {
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex !== -1) {
        currentEvent.uid = trimmed.substring(colonIndex + 1).trim();
      }
    }
  }

  return events;
}

/**
 * Parse an iCal date line into a JavaScript Date.
 * Supports:
 *   DTSTART;VALUE=DATE:20260315
 *   DTSTART:20260315T150000Z
 *   DTSTART;TZID=Africa/Algiers:20260315T150000
 */
function parseIcalDate(line) {
  // Extract the value after the last colon
  const colonIndex = line.indexOf(':');
  if (colonIndex === -1) return null;

  const value = line.substring(colonIndex + 1).trim();

  // Date-only format: YYYYMMDD
  if (/^\d{8}$/.test(value)) {
    const year = parseInt(value.substring(0, 4));
    const month = parseInt(value.substring(4, 6)) - 1;
    const day = parseInt(value.substring(6, 8));
    return new Date(year, month, day);
  }

  // DateTime format: YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
  const dtMatch = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (dtMatch) {
    const [, year, month, day, hour, minute, second, utc] = dtMatch;
    if (utc === 'Z') {
      return new Date(Date.UTC(
        parseInt(year), parseInt(month) - 1, parseInt(day),
        parseInt(hour), parseInt(minute), parseInt(second)
      ));
    }
    return new Date(
      parseInt(year), parseInt(month) - 1, parseInt(day),
      parseInt(hour), parseInt(minute), parseInt(second)
    );
  }

  return null;
}

/**
 * Format a Date to iCal DATE format: YYYYMMDD
 */
function formatIcalDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Fetch a URL and return its text content.
 * Follows redirects (up to 5 hops). Uses Node.js built-in http/https.
 */
function fetchUrl(urlString, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects < 0) {
      return reject(new Error('Too many redirects'));
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(urlString);
    } catch {
      return reject(new Error('Invalid URL format'));
    }

    const client = parsedUrl.protocol === 'https:' ? https : http;

    const request = client.get(urlString, { timeout: 15000 }, (response) => {
      // Handle redirects
      if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
        const redirectUrl = new URL(response.headers.location, urlString).toString();
        return fetchUrl(redirectUrl, maxRedirects - 1).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        return reject(new Error(`HTTP ${response.statusCode}: Failed to fetch calendar`));
      }

      let data = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        data += chunk;
        // Limit to 5MB to prevent abuse
        if (data.length > 5 * 1024 * 1024) {
          request.destroy();
          reject(new Error('Calendar file too large (max 5MB)'));
        }
      });
      response.on('end', () => resolve(data));
      response.on('error', reject);
    });

    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timed out after 15 seconds'));
    });

    request.on('error', reject);
  });
}

/**
 * Helper: Verify the authenticated user owns the listing.
 * Returns the listing if authorized, or sends an error response and returns null.
 */
async function getOwnedListing(req, res) {
  const { listingId } = req.params;

  const listing = await Listing.findById(listingId);
  if (!listing) {
    res.status(404).json({ success: false, message: 'Listing not found' });
    return null;
  }

  if (listing.host.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
    res.status(403).json({ success: false, message: 'Not authorized - you do not own this listing' });
    return null;
  }

  return listing;
}

/**
 * Sync a single external calendar: fetch, parse, and return blocked date entries.
 */
async function syncOneCalendar(calendar) {
  const icalText = await fetchUrl(calendar.url);
  const events = parseIcalData(icalText);

  const blockedEntries = [];
  for (const event of events) {
    if (event.dtstart && event.dtend) {
      blockedEntries.push({
        startDate: event.dtstart,
        endDate: event.dtend,
        reason: event.summary || 'External reservation',
        source: 'ical',
        externalCalendarName: calendar.name
      });
    }
  }
  return blockedEntries;
}

// ============================================================================
// CONTROLLER FUNCTIONS
// ============================================================================

/**
 * @route   POST /api/calendar/listings/:listingId/generate-token
 * @desc    Generate a unique iCal token for a listing so it can be exported
 * @access  Private (listing owner only)
 */
const generateIcalToken = async (req, res) => {
  try {
    const listing = await getOwnedListing(req, res);
    if (!listing) return; // response already sent

    // Generate a cryptographically secure random token
    const token = crypto.randomBytes(32).toString('hex');
    listing.icalToken = token;
    await listing.save({ validateBeforeSave: false });

    // Build the full iCal URL
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const icalUrl = `${baseUrl}/api/calendar/ical/${token}.ics`;

    res.status(200).json({
      success: true,
      message: 'iCal token generated successfully',
      data: {
        icalToken: token,
        icalUrl
      }
    });
  } catch (error) {
    console.error('Error generating iCal token:', error);
    res.status(500).json({ success: false, message: 'Server error while generating iCal token' });
  }
};

/**
 * @route   GET /api/calendar/ical/:token.ics
 * @desc    Public endpoint - serves an iCal (.ics) file for external platforms
 * @access  Public (no auth - accessed by Airbnb, Booking.com, etc.)
 */
const exportIcal = async (req, res) => {
  try {
    const { token } = req.params;

    // Find listing by token (NOT by listing id, for security)
    const listing = await Listing.findOne({ icalToken: token });
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Calendar not found' });
    }

    // Fetch all confirmed/paid/active bookings for this listing
    const bookings = await Booking.find({
      listing: listing._id,
      status: { $in: ['confirmed', 'paid', 'active', 'completed'] }
    }).select('startDate endDate status _id');

    // Build the iCal content (RFC 5545)
    const calendarName = `Baytup - ${listing.title}`;
    let ical = '';
    ical += 'BEGIN:VCALENDAR\r\n';
    ical += 'VERSION:2.0\r\n';
    ical += 'PRODID:-//Baytup//Calendar//EN\r\n';
    ical += 'CALSCALE:GREGORIAN\r\n';
    ical += 'METHOD:PUBLISH\r\n';
    ical += `X-WR-CALNAME:${calendarName}\r\n`;

    // Add booking events
    for (const booking of bookings) {
      ical += 'BEGIN:VEVENT\r\n';
      ical += `DTSTART;VALUE=DATE:${formatIcalDate(booking.startDate)}\r\n`;
      ical += `DTEND;VALUE=DATE:${formatIcalDate(booking.endDate)}\r\n`;
      ical += 'SUMMARY:Reserved - Baytup\r\n';
      ical += `UID:${booking._id}@baytup.com\r\n`;
      ical += 'STATUS:CONFIRMED\r\n';
      ical += `DTSTAMP:${formatIcalDate(new Date())}T000000Z\r\n`;
      ical += 'END:VEVENT\r\n';
    }

    // Add blocked dates
    if (listing.blockedDates && listing.blockedDates.length > 0) {
      for (const blocked of listing.blockedDates) {
        const uid = blocked._id
          ? `blocked-${blocked._id}@baytup.com`
          : `blocked-${formatIcalDate(blocked.startDate)}-${formatIcalDate(blocked.endDate)}@baytup.com`;
        const summary = blocked.source === 'ical'
          ? `Blocked (${blocked.externalCalendarName || 'External'})`
          : `Blocked - ${blocked.reason || 'Not available'}`;

        ical += 'BEGIN:VEVENT\r\n';
        ical += `DTSTART;VALUE=DATE:${formatIcalDate(blocked.startDate)}\r\n`;
        ical += `DTEND;VALUE=DATE:${formatIcalDate(blocked.endDate)}\r\n`;
        ical += `SUMMARY:${summary}\r\n`;
        ical += `UID:${uid}\r\n`;
        ical += 'STATUS:CONFIRMED\r\n';
        ical += `DTSTAMP:${formatIcalDate(new Date())}T000000Z\r\n`;
        ical += 'END:VEVENT\r\n';
      }
    }

    ical += 'END:VCALENDAR\r\n';

    // Set proper headers for iCal file
    res.set('Content-Type', 'text/calendar; charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename="baytup-calendar.ics"');
    res.send(ical);
  } catch (error) {
    console.error('Error exporting iCal:', error);
    res.status(500).json({ success: false, message: 'Server error while exporting calendar' });
  }
};

/**
 * @route   POST /api/calendar/listings/:listingId/import
 * @desc    Import an external iCal URL (Airbnb, Booking.com, etc.)
 * @access  Private (listing owner only)
 */
const importExternalCalendar = async (req, res) => {
  try {
    const listing = await getOwnedListing(req, res);
    if (!listing) return;

    const { name, url } = req.body;

    // Validate inputs
    if (!name || !url) {
      return res.status(400).json({
        success: false,
        message: 'Both "name" and "url" are required'
      });
    }

    if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Calendar name must be between 1 and 100 characters'
      });
    }

    // Validate URL format
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Invalid URL format'
      });
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({
        success: false,
        message: 'URL must use HTTP or HTTPS protocol'
      });
    }

    // Max 5 external calendars per listing
    if (listing.externalCalendars && listing.externalCalendars.length >= 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 5 external calendars per listing. Remove one before adding another.'
      });
    }

    // Check for duplicate URL
    const duplicate = (listing.externalCalendars || []).find(
      cal => cal.url === url
    );
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: `This calendar URL is already imported as "${duplicate.name}"`
      });
    }

    // Fetch and parse the external iCal
    let icalText;
    try {
      icalText = await fetchUrl(url);
    } catch (fetchError) {
      return res.status(400).json({
        success: false,
        message: `Failed to fetch calendar: ${fetchError.message}`
      });
    }

    // Verify it looks like an iCal file
    if (!icalText.includes('BEGIN:VCALENDAR')) {
      return res.status(400).json({
        success: false,
        message: 'The URL does not appear to be a valid iCal calendar file'
      });
    }

    const events = parseIcalData(icalText);
    const trimmedName = name.trim();

    // Remove any existing blocked dates from a calendar with the same name (in case of re-import)
    listing.blockedDates = (listing.blockedDates || []).filter(
      bd => !(bd.source === 'ical' && bd.externalCalendarName === trimmedName)
    );

    // Add new blocked dates from parsed events
    const newBlockedDates = [];
    for (const event of events) {
      if (event.dtstart && event.dtend) {
        const entry = {
          startDate: event.dtstart,
          endDate: event.dtend,
          reason: event.summary || 'External reservation',
          source: 'ical',
          externalCalendarName: trimmedName
        };
        listing.blockedDates.push(entry);
        newBlockedDates.push(entry);
      }
    }

    // Add or update the external calendar entry
    if (!listing.externalCalendars) {
      listing.externalCalendars = [];
    }
    listing.externalCalendars.push({
      name: trimmedName,
      url: url,
      lastSynced: new Date(),
      lastError: null
    });

    await listing.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: `Calendar "${trimmedName}" imported successfully`,
      data: {
        calendarName: trimmedName,
        eventsImported: newBlockedDates.length,
        totalExternalCalendars: listing.externalCalendars.length,
        blockedDates: newBlockedDates
      }
    });
  } catch (error) {
    console.error('Error importing external calendar:', error);
    res.status(500).json({ success: false, message: 'Server error while importing calendar' });
  }
};

/**
 * @route   DELETE /api/calendar/listings/:listingId/external/:calendarIndex
 * @desc    Remove an imported external calendar and its blocked dates
 * @access  Private (listing owner only)
 */
const removeExternalCalendar = async (req, res) => {
  try {
    const listing = await getOwnedListing(req, res);
    if (!listing) return;

    const { calendarIndex } = req.params;
    const index = parseInt(calendarIndex);

    if (isNaN(index) || index < 0 || !listing.externalCalendars || index >= listing.externalCalendars.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid calendar index'
      });
    }

    const calendarToRemove = listing.externalCalendars[index];
    const calendarName = calendarToRemove.name;

    // Remove associated blocked dates
    listing.blockedDates = (listing.blockedDates || []).filter(
      bd => !(bd.source === 'ical' && bd.externalCalendarName === calendarName)
    );

    // Remove the calendar entry
    listing.externalCalendars.splice(index, 1);

    await listing.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: `Calendar "${calendarName}" removed successfully`,
      data: {
        removedCalendar: calendarName,
        remainingCalendars: listing.externalCalendars.length
      }
    });
  } catch (error) {
    console.error('Error removing external calendar:', error);
    res.status(500).json({ success: false, message: 'Server error while removing calendar' });
  }
};

/**
 * @route   POST /api/calendar/listings/:listingId/sync
 * @desc    Manually refresh (re-sync) all imported external calendars
 * @access  Private (listing owner only)
 */
const syncAllCalendars = async (req, res) => {
  try {
    const listing = await getOwnedListing(req, res);
    if (!listing) return;

    if (!listing.externalCalendars || listing.externalCalendars.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No external calendars to sync'
      });
    }

    // Remove ALL ical-sourced blocked dates (will be replaced)
    listing.blockedDates = (listing.blockedDates || []).filter(
      bd => bd.source !== 'ical'
    );

    const results = [];

    for (const calendar of listing.externalCalendars) {
      try {
        const blockedEntries = await syncOneCalendar(calendar);

        // Add the blocked dates to the listing
        for (const entry of blockedEntries) {
          listing.blockedDates.push(entry);
        }

        calendar.lastSynced = new Date();
        calendar.lastError = null;

        results.push({
          name: calendar.name,
          status: 'success',
          eventsImported: blockedEntries.length
        });
      } catch (syncError) {
        calendar.lastError = syncError.message;
        calendar.lastSynced = new Date();

        results.push({
          name: calendar.name,
          status: 'error',
          error: syncError.message
        });
      }
    }

    await listing.save({ validateBeforeSave: false });

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    res.status(200).json({
      success: true,
      message: `Sync complete: ${successCount} succeeded, ${errorCount} failed`,
      data: {
        results,
        totalBlockedDates: listing.blockedDates.length
      }
    });
  } catch (error) {
    console.error('Error syncing calendars:', error);
    res.status(500).json({ success: false, message: 'Server error while syncing calendars' });
  }
};

module.exports = {
  generateIcalToken,
  exportIcal,
  importExternalCalendar,
  removeExternalCalendar,
  syncAllCalendars
};
