const express = require('express');
const router = express.Router();

/**
 * Proxy for Nominatim reverse geocoding
 * Avoids CORS issues when calling from the browser
 * GET /api/geocode/reverse?lat=36.75&lon=3.06&lang=fr
 */
router.get('/reverse', async (req, res) => {
  const { lat, lon, lang } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'lat and lon are required' });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Baytup/1.0 (https://baytup.com)',
        'Accept-Language': lang || 'fr',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Nominatim error' });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('[Geocode] Reverse geocoding error:', error.message);
    res.status(500).json({ error: 'Geocoding failed' });
  }
});

/**
 * Proxy for Nominatim forward geocoding (address search)
 * GET /api/geocode/search?q=23+Rue+Didouche&lang=fr
 */
router.get('/search', async (req, res) => {
  const { q, lang } = req.query;

  if (!q || String(q).trim().length < 3) {
    return res.status(400).json({ error: 'Query must be at least 3 characters' });
  }

  try {
    const query = encodeURIComponent(String(q).trim());
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&countrycodes=dz&limit=5&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Baytup/1.0 (https://baytup.com)',
        'Accept-Language': lang || 'fr',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Nominatim error' });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('[Geocode] Search error:', error.message);
    res.status(500).json({ error: 'Geocoding search failed' });
  }
});

module.exports = router;
