const express = require('express');
const { readItems, addItem } = require('../lib/dataStore');
const { parseItemPayload, parseListQuery, parseId } = require('../lib/validation');

const router = express.Router();

// Matches against name and category, tolerating items missing either field.
function matchesQuery(item, needle) {
  const haystack = `${item.name ?? ''} ${item.category ?? ''}`.toLowerCase();
  return haystack.includes(needle);
}

const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

function compareBy(field, order) {
  const direction = order === 'desc' ? -1 : 1;

  return (a, b) => {
    if (field === 'name') {
      return collator.compare(a.name ?? '', b.name ?? '') * direction;
    }
    return ((Number(a[field]) || 0) - (Number(b[field]) || 0)) * direction;
  };
}

// GET /api/items?q=&category=&sort=&order=&page=&limit=&offset=
router.get('/', async (req, res, next) => {
  try {
    const { q, category, sort, order, limit, offset, page } = parseListQuery(req.query);
    const items = await readItems();

    // Lowercase the needle once, not once per item.
    let filtered = q ? items.filter((item) => matchesQuery(item, q.toLowerCase())) : items;

    if (category) {
      const needle = category.toLowerCase();
      filtered = filtered.filter((item) => (item.category ?? '').toLowerCase() === needle);
    }

    // Sort before slicing, and never mutate the cached array.
    if (sort !== 'id' || order !== 'asc') {
      filtered = [...filtered].sort(compareBy(sort, order));
    }

    const pageItems = filtered.slice(offset, offset + limit);

    res.json({
      items: pageItems,
      total: filtered.length,
      page,
      limit,
      offset,
      sort,
      order,
      totalPages: Math.ceil(filtered.length / limit),
      hasMore: offset + pageItems.length < filtered.length,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/items/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const items = await readItems();
    const item = items.find((candidate) => Number(candidate.id) === id);

    if (!item) {
      const err = new Error('Item not found');
      err.status = 404;
      throw err;
    }
    res.json(item);
  } catch (err) {
    next(err);
  }
});

// POST /api/items
router.post('/', async (req, res, next) => {
  try {
    const fields = parseItemPayload(req.body);
    const created = await addItem(fields);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
