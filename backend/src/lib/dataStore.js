const fs = require('fs/promises');
const path = require('path');
const { computeStats } = require('../utils/stats');

const DATA_PATH = path.resolve(__dirname, '../../../data/items.json');

// cache = { mtimeMs, items, stats } — `stats` is computed lazily and thrown away
// whenever the file changes, so /api/stats never recalculates for an unchanged file.
let cache = null;

// All writes funnel through this promise chain so a read-modify-write cycle can
// never interleave with another one and lose an item.
let writeQueue = Promise.resolve();

function parseItems(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    const e = new Error(`Data store contains malformed JSON: ${err.message}`);
    e.status = 500;
    throw e;
  }
  if (!Array.isArray(parsed)) {
    const e = new Error('Data store must contain a JSON array');
    e.status = 500;
    throw e;
  }
  return parsed;
}

// Reads straight from disk, bypassing the cache. Used by the write path, which
// must never build on a stale snapshot.
async function readFromDisk() {
  const raw = await fs.readFile(DATA_PATH, 'utf8');
  const { mtimeMs } = await fs.stat(DATA_PATH);
  return { items: parseItems(raw), mtimeMs };
}

/**
 * Returns the items, re-reading only when the file's mtime has moved.
 * The array is shared — callers must treat it as read-only.
 */
async function readItems() {
  const { mtimeMs } = await fs.stat(DATA_PATH);
  if (cache && cache.mtimeMs === mtimeMs) return cache.items;

  const raw = await fs.readFile(DATA_PATH, 'utf8');
  cache = { mtimeMs, items: parseItems(raw), stats: null };
  return cache.items;
}

async function getStats() {
  const items = await readItems();
  if (!cache.stats) cache.stats = computeStats(items);
  return cache.stats;
}

// Write to a sibling temp file and rename over the target. rename is atomic on
// the same filesystem, so a crash mid-write leaves the original file intact.
async function writeAtomic(items) {
  const tmp = `${DATA_PATH}.${process.pid}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
  await fs.rename(tmp, DATA_PATH);
  const { mtimeMs } = await fs.stat(DATA_PATH);
  cache = { mtimeMs, items, stats: null };
}

function enqueue(task) {
  const run = writeQueue.then(task, task);
  // Keep the chain alive even if this task rejected.
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/**
 * Appends an item under a serialized read-modify-write, assigning the next
 * sequential id. Returns the stored item.
 */
async function addItem(fields) {
  return enqueue(async () => {
    const { items } = await readFromDisk();
    const maxId = items.reduce((max, item) => {
      const id = Number(item.id);
      return Number.isFinite(id) && id > max ? id : max;
    }, 0);

    const created = { id: maxId + 1, ...fields };
    await writeAtomic([...items, created]);
    return created;
  });
}

// Test seam — lets a suite start from a known cache state.
function clearCache() {
  cache = null;
}

module.exports = { DATA_PATH, readItems, getStats, addItem, clearCache };
