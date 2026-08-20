const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const MAX_NAME_LENGTH = 200;
const SORT_FIELDS = ['id', 'name', 'price'];
const SORT_ORDERS = ['asc', 'desc'];

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

/**
 * Parses an item payload, returning only known fields. Throws a 400 rather than
 * persisting a shape that would break `/api/items?q=` on every later request.
 */
function parseItemPayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw badRequest('Request body must be a JSON object');
  }

  const { name, category, price } = body;

  if (typeof name !== 'string' || !name.trim()) {
    throw badRequest('`name` is required and must be a non-empty string');
  }
  if (name.trim().length > MAX_NAME_LENGTH) {
    throw badRequest(`\`name\` must be at most ${MAX_NAME_LENGTH} characters`);
  }
  if (typeof category !== 'string' || !category.trim()) {
    throw badRequest('`category` is required and must be a non-empty string');
  }

  const parsedPrice = typeof price === 'number' ? price : Number(price);
  if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
    throw badRequest('`price` is required and must be a number >= 0');
  }

  return {
    name: name.trim(),
    category: category.trim(),
    price: parsedPrice,
  };
}

/**
 * Reads pagination and search params. Invalid numbers are rejected outright
 * instead of silently degrading to an empty page.
 */
function parseListQuery(query) {
  const { q, page, limit, offset, category, sort, order } = query;

  let parsedLimit = DEFAULT_LIMIT;
  if (limit !== undefined) {
    parsedLimit = Number(limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
      throw badRequest('`limit` must be a positive integer');
    }
    parsedLimit = Math.min(parsedLimit, MAX_LIMIT);
  }

  let parsedPage = 1;
  if (page !== undefined) {
    parsedPage = Number(page);
    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      throw badRequest('`page` must be a positive integer');
    }
  }

  // `offset` wins when supplied — it's what a virtualized list wants to send.
  let parsedOffset = (parsedPage - 1) * parsedLimit;
  if (offset !== undefined) {
    parsedOffset = Number(offset);
    if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
      throw badRequest('`offset` must be an integer >= 0');
    }
    parsedPage = Math.floor(parsedOffset / parsedLimit) + 1;
  }

  if (q !== undefined && typeof q !== 'string') {
    throw badRequest('`q` must be a string');
  }
  if (category !== undefined && typeof category !== 'string') {
    throw badRequest('`category` must be a string');
  }
  if (sort !== undefined && !SORT_FIELDS.includes(sort)) {
    throw badRequest(`\`sort\` must be one of: ${SORT_FIELDS.join(', ')}`);
  }
  if (order !== undefined && !SORT_ORDERS.includes(order)) {
    throw badRequest(`\`order\` must be one of: ${SORT_ORDERS.join(', ')}`);
  }

  return {
    q: typeof q === 'string' ? q.trim() : '',
    category: typeof category === 'string' ? category.trim() : '',
    sort: sort || 'id',
    order: order || 'asc',
    limit: parsedLimit,
    offset: parsedOffset,
    page: parsedPage,
  };
}

/** Strict positive-integer route param — rejects `3abc`, `NaN`, `-1`, `1e3`. */
function parseId(raw) {
  if (!/^\d+$/.test(String(raw))) {
    throw badRequest('`id` must be a positive integer');
  }
  const id = Number(raw);
  if (!Number.isSafeInteger(id)) throw badRequest('`id` is out of range');
  return id;
}

module.exports = {
  parseItemPayload,
  parseListQuery,
  parseId,
  MAX_LIMIT,
  DEFAULT_LIMIT,
  SORT_FIELDS,
  SORT_ORDERS,
};
