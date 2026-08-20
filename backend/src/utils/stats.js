function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Derives the stats payload from a list of items. Prices that aren't finite
 * numbers are skipped rather than poisoning the average with NaN.
 */
function computeStats(items) {
  const prices = items
    .map((item) => Number(item.price))
    .filter((price) => Number.isFinite(price));

  // Facet counts ride along on the same cached pass, so the category filter
  // costs the client nothing extra.
  const counts = new Map();
  for (const item of items) {
    const category = item.category ?? 'Uncategorised';
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  return {
    total: items.length,
    averagePrice: Number(mean(prices).toFixed(2)),
    // Folded rather than spread — `Math.min(...prices)` overflows the call
    // stack once the dataset gets large.
    minPrice: prices.reduce((min, price) => (price < min ? price : min), prices[0] ?? 0),
    maxPrice: prices.reduce((max, price) => (price > max ? price : max), prices[0] ?? 0),
    categories: [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  };
}

module.exports = { mean, computeStats };
