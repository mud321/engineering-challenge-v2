#!/usr/bin/env node
/**
 * Grows data/items.json to a size where pagination and virtualization are
 * actually exercisable. The five original items are kept as the head of the
 * list, so the committed fixture data is preserved as a subset.
 *
 *   node scripts/seed.js            # 5000 items
 *   node scripts/seed.js --count=250
 */
const fs = require('fs/promises');
const path = require('path');

const DATA_PATH = path.resolve(__dirname, '../../data/items.json');

const ORIGINAL = [
  { id: 1, name: 'Laptop Pro', category: 'Electronics', price: 2499 },
  { id: 2, name: 'Noise Cancelling Headphones', category: 'Electronics', price: 399 },
  { id: 3, name: 'Ultra‑Wide Monitor', category: 'Electronics', price: 999 },
  { id: 4, name: 'Ergonomic Chair', category: 'Furniture', price: 799 },
  { id: 5, name: 'Standing Desk', category: 'Furniture', price: 1199 },
];

const CATEGORIES = {
  Electronics: ['Monitor', 'Keyboard', 'Mouse', 'Webcam', 'Docking Station', 'SSD', 'Router'],
  Furniture: ['Desk', 'Chair', 'Bookshelf', 'Filing Cabinet', 'Standing Mat', 'Lamp'],
  Kitchen: ['Espresso Machine', 'Kettle', 'Blender', 'Toaster', 'Knife Set'],
  Outdoors: ['Tent', 'Backpack', 'Sleeping Bag', 'Trekking Poles', 'Headlamp'],
  Office: ['Notebook', 'Whiteboard', 'Label Maker', 'Paper Shredder', 'Desk Organizer'],
};

const QUALIFIERS = ['Compact', 'Pro', 'Elite', 'Studio', 'Traveler', 'Heavy Duty', 'Mini', 'Max'];
const MATERIALS = ['Aluminium', 'Walnut', 'Carbon', 'Oak', 'Steel', 'Bamboo', 'Matte Black'];

// Deterministic PRNG so repeated seeds produce identical data (mulberry32).
function makeRandom(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function parseCount(argv) {
  const flag = argv.find((arg) => arg.startsWith('--count='));
  if (!flag) return 5000;
  const count = Number(flag.split('=')[1]);
  if (!Number.isInteger(count) || count < ORIGINAL.length) {
    throw new Error(`--count must be an integer >= ${ORIGINAL.length}`);
  }
  return count;
}

function generate(count) {
  const random = makeRandom(20260820);
  const pick = (arr) => arr[Math.floor(random() * arr.length)];
  const categories = Object.keys(CATEGORIES);
  const items = [...ORIGINAL];

  for (let id = ORIGINAL.length + 1; id <= count; id += 1) {
    const category = pick(categories);
    const name = `${pick(MATERIALS)} ${pick(CATEGORIES[category])} ${pick(QUALIFIERS)}`;
    items.push({
      id,
      name,
      category,
      price: Math.round((random() * 2480 + 19) * 100) / 100,
    });
  }
  return items;
}

async function main() {
  const count = parseCount(process.argv.slice(2));
  const items = generate(count);

  // Atomic replace, matching the write path used by the API.
  const tmp = `${DATA_PATH}.seed.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
  await fs.rename(tmp, DATA_PATH);

  console.log(`Seeded ${items.length} items to ${DATA_PATH}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
