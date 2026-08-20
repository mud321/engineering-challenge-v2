const express = require('express');
const { getStats } = require('../lib/dataStore');

const router = express.Router();

// GET /api/stats
// Served from cache; the data store recomputes only after the file's mtime moves.
router.get('/', async (req, res, next) => {
  try {
    res.json(await getStats());
  } catch (err) {
    next(err);
  }
});

module.exports = router;
