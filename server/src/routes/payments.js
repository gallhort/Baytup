const express = require('express');
const router = express.Router();

if (process.env.NODE_ENV !== 'production') {
  router.get('/test', (req, res) => {
    res.json({ message: 'Payments route working' });
  });
}

module.exports = router;