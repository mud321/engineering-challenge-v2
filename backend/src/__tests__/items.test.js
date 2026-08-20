const fs = require('fs/promises');
const request = require('supertest');
const app = require('../app');
const { DATA_PATH, clearCache } = require('../lib/dataStore');

const FIXTURE = [
  { id: 1, name: 'Laptop Pro', category: 'Electronics', price: 2499 },
  { id: 2, name: 'Noise Cancelling Headphones', category: 'Electronics', price: 399 },
  { id: 3, name: 'Ultra-Wide Monitor', category: 'Electronics', price: 999 },
  { id: 4, name: 'Ergonomic Chair', category: 'Furniture', price: 799 },
  { id: 5, name: 'Standing Desk', category: 'Furniture', price: 1199 },
];

let original;

beforeAll(async () => {
  original = await fs.readFile(DATA_PATH, 'utf8');
});

beforeEach(async () => {
  await fs.writeFile(DATA_PATH, JSON.stringify(FIXTURE, null, 2), 'utf8');
  clearCache();
});

// Always hand the repo's data file back exactly as we found it.
afterAll(async () => {
  await fs.writeFile(DATA_PATH, original, 'utf8');
});

describe('GET /api/items', () => {
  it('returns a paginated envelope', async () => {
    const res = await request(app).get('/api/items?limit=2');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body).toMatchObject({ total: 5, page: 1, limit: 2, totalPages: 3, hasMore: true });
  });

  it('paginates by page number', async () => {
    const res = await request(app).get('/api/items?limit=2&page=3');
    expect(res.body.items.map((i) => i.id)).toEqual([5]);
    expect(res.body.hasMore).toBe(false);
  });

  it('supports offset-based windows for virtualized lists', async () => {
    const res = await request(app).get('/api/items?limit=2&offset=1');
    expect(res.body.items.map((i) => i.id)).toEqual([2, 3]);
  });

  it('searches name and category case-insensitively', async () => {
    const byName = await request(app).get('/api/items?q=laptop');
    expect(byName.body.items.map((i) => i.id)).toEqual([1]);

    const byCategory = await request(app).get('/api/items?q=FURNITURE');
    expect(byCategory.body.total).toBe(2);
  });

  it('returns an empty page rather than an error when nothing matches', async () => {
    const res = await request(app).get('/api/items?q=zzzznope');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ items: [], total: 0, totalPages: 0, hasMore: false });
  });

  it('rejects a non-numeric limit instead of silently returning []', async () => {
    const res = await request(app).get('/api/items?limit=abc');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/limit/);
  });

  it('caps limit at the maximum', async () => {
    const res = await request(app).get('/api/items?limit=99999');
    expect(res.body.limit).toBe(100);
  });
});

describe('GET /api/items — filtering and sorting', () => {
  it('filters by exact category, case-insensitively', async () => {
    const res = await request(app).get('/api/items?category=furniture');
    expect(res.body.total).toBe(2);
    expect(res.body.items.every((i) => i.category === 'Furniture')).toBe(true);
  });

  it('combines search, category, and pagination', async () => {
    const res = await request(app).get('/api/items?q=e&category=Electronics&limit=2');
    expect(res.body.total).toBe(3);
    expect(res.body.items).toHaveLength(2);
  });

  it('sorts by price in both directions', async () => {
    const asc = await request(app).get('/api/items?sort=price&order=asc');
    expect(asc.body.items[0].price).toBe(399);

    const desc = await request(app).get('/api/items?sort=price&order=desc');
    expect(desc.body.items[0].price).toBe(2499);
  });

  it('sorts by name using a natural collation', async () => {
    const res = await request(app).get('/api/items?sort=name&order=asc');
    expect(res.body.items[0].name).toBe('Ergonomic Chair');
  });

  it('echoes the applied sort back to the client', async () => {
    const res = await request(app).get('/api/items?sort=price&order=desc');
    expect(res.body).toMatchObject({ sort: 'price', order: 'desc' });
  });

  it('rejects an unknown sort field or order', async () => {
    await request(app).get('/api/items?sort=colour').expect(400);
    await request(app).get('/api/items?order=sideways').expect(400);
  });

  it('does not mutate the cached array when sorting', async () => {
    await request(app).get('/api/items?sort=price&order=desc').expect(200);
    const res = await request(app).get('/api/items');
    expect(res.body.items.map((i) => i.id)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('GET /api/items/:id', () => {
  it('returns the item', async () => {
    const res = await request(app).get('/api/items/3');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(3);
  });

  it('rejects a malformed id rather than coercing it', async () => {
    const res = await request(app).get('/api/items/3abc');
    expect(res.status).toBe(400);
  });

  it('404s for a missing id', async () => {
    const res = await request(app).get('/api/items/9999');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/items', () => {
  it('creates an item with a sequential id', async () => {
    const res = await request(app)
      .post('/api/items')
      .send({ name: 'Desk Lamp', category: 'Office', price: 49.5 });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 6, name: 'Desk Lamp', category: 'Office', price: 49.5 });
  });

  it.each([
    ['empty body', {}],
    ['missing name', { category: 'Office', price: 10 }],
    ['blank name', { name: '   ', category: 'Office', price: 10 }],
    ['missing category', { name: 'Thing', price: 10 }],
    ['non-numeric price', { name: 'Thing', category: 'Office', price: 'free' }],
    ['negative price', { name: 'Thing', category: 'Office', price: -1 }],
  ])('rejects %s', async (_label, payload) => {
    const res = await request(app).post('/api/items').send(payload);
    expect(res.status).toBe(400);
  });

  it('strips unknown fields so search cannot be poisoned', async () => {
    await request(app)
      .post('/api/items')
      .send({ name: 'Thing', category: 'Office', price: 1, lol: 'nope' })
      .expect(201);

    const res = await request(app).get('/api/items?q=laptop');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
  });

  it('does not lose writes issued concurrently', async () => {
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post('/api/items')
          .send({ name: `Concurrent ${i}`, category: 'Office', price: i })
          .expect(201),
      ),
    );

    const res = await request(app).get('/api/items?limit=100');
    expect(res.body.total).toBe(15);
    const ids = res.body.items.map((i) => i.id);
    expect(new Set(ids).size).toBe(15);
  });
});

describe('GET /api/stats', () => {
  it('returns totals derived from the data file', async () => {
    const res = await request(app).get('/api/stats');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      total: 5,
      averagePrice: 1179,
      minPrice: 399,
      maxPrice: 2499,
    });
  });

  it('returns category facets ordered by count', async () => {
    const res = await request(app).get('/api/stats');
    expect(res.body.categories).toEqual([
      { name: 'Electronics', count: 3 },
      { name: 'Furniture', count: 2 },
    ]);
  });

  it('reflects new items once the file changes', async () => {
    await request(app).get('/api/stats').expect(200);
    await request(app)
      .post('/api/items')
      .send({ name: 'Cheap Thing', category: 'Office', price: 0 })
      .expect(201);

    const res = await request(app).get('/api/stats');
    expect(res.body.total).toBe(6);
  });
});

describe('error handling', () => {
  it('404s unknown routes as JSON', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/Cannot GET/);
  });

  it('does not leak filesystem paths on failure', async () => {
    await fs.writeFile(DATA_PATH, '{ not json', 'utf8');
    clearCache();

    const res = await request(app).get('/api/items');
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toMatch(/items\.json/);
  });
});
