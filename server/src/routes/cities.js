const express = require('express');
const router = express.Router();
const algerianCities = require('../data/algerianCities');

/**
 * Fonction pour retirer les accents d'une chaîne
 * Permet de chercher "bejaia" et trouver "Béjaïa"
 */
const removeAccents = (str) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

/**
 * GET /api/cities/search
 * Recherche de villes algériennes (alternative gratuite à Google Places Autocomplete)
 *
 * Query params:
 * - q: Terme de recherche (nom de ville)
 * - limit: Nombre maximum de résultats (default: 10)
 *
 * @returns {Array} Liste de villes correspondantes
 */
router.get('/search', (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({
        status: 'success',
        data: {
          cities: [],
          count: 0
        }
      });
    }

    const searchTerm = q.toLowerCase().trim();
    const searchTermNoAccents = removeAccents(searchTerm);

    // Recherche dans les noms français et arabes (avec et sans accents)
    const results = algerianCities
      .filter(city => {
        // Recherche avec accents
        const nameMatch = city.name.toLowerCase().includes(searchTerm);
        const wilayaMatch = city.wilaya.toLowerCase().includes(searchTerm);

        // Recherche sans accents (bejaia trouve Béjaïa)
        const nameNoAccents = removeAccents(city.name.toLowerCase());
        const wilayaNoAccents = removeAccents(city.wilaya.toLowerCase());
        const nameMatchNoAccents = nameNoAccents.includes(searchTermNoAccents);
        const wilayaMatchNoAccents = wilayaNoAccents.includes(searchTermNoAccents);

        // Recherche en arabe
        const nameArMatch = city.nameAr.includes(q.trim());

        return nameMatch || wilayaMatch || nameMatchNoAccents || wilayaMatchNoAccents || nameArMatch;
      })
      // Trier par population (villes principales en premier)
      .sort((a, b) => b.population - a.population)
      // Limiter les résultats
      .slice(0, parseInt(limit))
      // Formater la réponse
      .map(city => ({
        id: city.id,
        name: city.name,
        nameAr: city.nameAr,
        wilaya: city.wilaya,
        wilayaCode: city.wilayaCode,
        coordinates: city.coordinates, // [lat, lng]
        population: city.population,
        // Format compatible avec l'ancienne API Google
        formatted_address: `${city.name}, ${city.wilaya}, Algeria`,
        display: `${city.name}, ${city.wilaya}`
      }));

    res.json({
      status: 'success',
      data: {
        cities: results,
        count: results.length
      }
    });
  } catch (error) {
    console.error('Error searching cities:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to search cities'
    });
  }
});

/**
 * GET /api/cities
 * Liste toutes les villes (ou filtrées par wilaya)
 *
 * Query params:
 * - wilaya: Code wilaya (1-48)
 * - limit: Nombre maximum de résultats
 *
 * @returns {Array} Liste de villes
 */
router.get('/', (req, res) => {
  try {
    const { wilaya, limit } = req.query;

    let results = algerianCities;

    // Filtrer par wilaya si spécifié
    if (wilaya) {
      results = results.filter(city =>
        city.wilayaCode === parseInt(wilaya)
      );
    }

    // Trier par population
    results = results.sort((a, b) => b.population - a.population);

    // Limiter si spécifié
    if (limit) {
      results = results.slice(0, parseInt(limit));
    }

    res.json({
      status: 'success',
      data: {
        cities: results,
        count: results.length
      }
    });
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch cities'
    });
  }
});

/**
 * GET /api/cities/:id
 * Récupérer une ville par son ID
 *
 * @param {number} id - ID de la ville
 * @returns {Object} Détails de la ville
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const city = algerianCities.find(c => c.id === parseInt(id));

    if (!city) {
      return res.status(404).json({
        status: 'error',
        message: 'City not found'
      });
    }

    res.json({
      status: 'success',
      data: { city }
    });
  } catch (error) {
    console.error('Error fetching city:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch city'
    });
  }
});

/**
 * GET /api/cities/wilaya/:code
 * Récupérer toutes les villes d'une wilaya
 *
 * @param {number} code - Code de la wilaya (1-48)
 * @returns {Array} Liste de villes de la wilaya
 */
router.get('/wilaya/:code', (req, res) => {
  try {
    const { code } = req.params;
    const cities = algerianCities
      .filter(city => city.wilayaCode === parseInt(code))
      .sort((a, b) => b.population - a.population);

    res.json({
      status: 'success',
      data: {
        cities,
        count: cities.length,
        wilayaCode: parseInt(code)
      }
    });
  } catch (error) {
    console.error('Error fetching wilaya cities:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch wilaya cities'
    });
  }
});

module.exports = router;
