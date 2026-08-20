# Solution Notes

## Quick start

```bash
# Terminal 1
cd backend
npm install
npm run seed        # grows data/items.json to 5000 items (optional but see note)
npm start           # http://localhost:4001

# Terminal 2
cd frontend
npm install
npm start           # http://localhost:3000

# Backend tests
cd backend && npm test
```

Runs on Node 20 and Node 24 (verified on 24.15.0).

> **Why seed?** The repo ships 5 items, which makes pagination and virtualization
> unobservable. `npm run seed` keeps those 5 as the head of the list and appends
> deterministically generated rows, so the original fixture data is a subset.

---

## Objectives

### Backend

**1. Refactor blocking I/O**

`fs.readFileSync` / `fs.writeFileSync` are gone. All disk access moved into
[`src/lib/dataStore.js`](backend/src/lib/dataStore.js) on `fs/promises`.

The write path also gained two properties it was missing:

- **Atomic** — writes go to a temp file and are `rename`d over the target, so a
  crash mid-write can no longer truncate the data file.
- **Serialized** — read-modify-write cycles run through a promise queue, so two
  concurrent `POST`s can't overwrite each other. Covered by a 10-way concurrent
  test.

**2. Cache `/api/stats`**

Stats are computed once and cached alongside the parsed items, keyed on the data
file's `mtimeMs`. A request re-reads only after the file actually changes, so
external edits are still picked up without a restart.

Measured against the running server (2000 sequential requests, keep-alive):

| | per request |
|---|---|
| `/api/health` (no I/O baseline) | 1.885 ms |
| `/api/stats` (cached) | 2.505 ms |
| `readFileSync` + `JSON.parse` of the 5000-item file | **25.797 ms** ← avoided |

Cached stats cost the baseline plus one `fs.stat`; the ~26 ms of parsing per
request is gone, and it no longer blocks the event loop.

The orphaned `mean()` helper in `src/utils/stats.js` is now used by
`computeStats()`, which also skips non-numeric prices instead of returning `NaN`.

### Frontend

**1. Memory leak**

The original `active` flag was unusable: `setItems` runs inside `DataProvider`,
not the component, so a local flag could never guard it. Fixed by threading an
`AbortController` through `fetchItems` and aborting on cleanup — the request is
actually cancelled, not just ignored.

`DataContext` also drops responses from superseded requests via a monotonic
request id, so a slow reply can't overwrite a newer one out of order.

**2. Pagination & server-side search**

`GET /api/items` now accepts `q`, `category`, `sort`, `order`, `page`, `limit`,
and `offset`, and returns an envelope:

```json
{ "items": [], "total": 0, "page": 1, "limit": 20, "offset": 0,
  "sort": "id", "order": "asc", "totalPages": 0, "hasMore": false }
```

`limit` is capped at 100. Search matches name **and** category, lowercasing the
needle once rather than per item. The client debounces input by 300 ms and resets
to page 1 on a new query.

**3. Virtualization**

`react-window`'s `FixedSizeList` renders only the visible window, so page size
can grow without cost. Row height is fixed at 64 px and the viewport is measured
with a `ResizeObserver` so it tracks the CSS layout.

**4. UI/UX polish**

A full design pass rather than a coat of paint. The substantive changes:

**URL is the source of truth.** `q`, `category`, `sort`, `order`, `page`, and
`limit` all live in the query string ([`useListParams`](frontend/src/hooks/useListParams.js)),
so a view is shareable, survives a refresh, and works with back/forward. Search
keystrokes use `replace` so they don't each become a history entry, and defaults
are omitted to keep the address clean. Returning from an item detail restores the
exact search and page via router state.

**Sort and filter.** `sort` (`id`/`name`/`price`) and `order`, plus an exact
`category` filter — all server-side, composable with search and pagination.
Name sorting uses `Intl.Collator` for natural ordering. Sorting copies before
sorting so the cached array is never mutated (covered by a test).

**Stats are actually shown.** `/api/stats` was cached and then ignored by the UI.
It now feeds a summary strip (total, average price, price range, category count)
and supplies the category facet counts for the filter dropdown — all from the one
cached payload, so the feature costs nothing per request.

**Pagination that works at scale.** Prev/Next alone is unusable across 100 pages.
Now a windowed page list with first/last always reachable, ellipsis for gaps,
`aria-current="page"`, and a per-page selector (25/50/100).

**Search feedback.** 300 ms debounce, matched substrings highlighted with `<mark>`
in both name and category, a clear button, `/` to focus and `Escape` to clear,
dismissible filter chips, and an `x–y of n` range readout.

**Keyboard navigation.** Roving tabindex over the virtualized rows: `↑`/`↓` to
move, `Home`/`End` to jump, with `scrollToItem` keeping the active row in view and
focus moved on the next frame (the row may have only just been mounted).

**Recoverable states.** The empty state names what failed and offers a one-click
"clear all filters"; errors offer retry; first load shows skeletons matching the
real row geometry; later fetches show an inline spinner so the list doesn't blank.

**Visual system.** Tokenised palette with a full dark theme, a 4 px spacing
rhythm, tabular numerals for all figures, a single consistent `:focus-visible`
ring, hover/active state layers distinguished from keyboard selection, and a
responsive breakpoint that drops the id and category columns on narrow screens.
`prefers-reduced-motion` disables all animation.

Accessibility throughout: skip link, labelled controls, `role="status"` result
counts, `aria-busy` on the list, ARIA list semantics preserved across
virtualization, and `sr-only` text on icon-only buttons.

---

## Bugs found that the brief didn't mention

**`/api/stats` returned 500 on every request.** Its `DATA_PATH` was
`../../data/items.json`, resolving to `backend/data/items.json` — a directory
that doesn't exist. `items.js` correctly used `../../../`.

**The item list couldn't load in a browser at all.** Two mistakes combined:
`cors({ origin: 'http://localhost:4001' })` allowed the backend's *own* port
instead of the frontend's, and `DataContext` used an absolute
`http://localhost:4001/...` URL that bypassed the Vite proxy. Either fix alone
works; both were fixed (relative URL + correct origin, overridable via
`CORS_ORIGIN`).

**An unvalidated `POST` could permanently disable search.** `POST {}` returned
`201` and persisted an item with no `name`; every later `?q=` request then threw
`Cannot read properties of undefined (reading 'toLowerCase')` and returned 500 —
on disk, surviving restart. Now validated (400), unknown fields stripped, and
the search predicate tolerates missing fields.

**Silent bad-input handling.** `?limit=abc` became `slice(0, NaN)` → `200 []`;
`/api/items/3abc` returned item 3 via loose `parseInt`. Both now 400.

**Stack traces and absolute filesystem paths leaked** on every error — there was
no error-handling middleware. Added, with a JSON 404 handler; 5xx messages are
generic in production.

**`id` collisions.** `Date.now()` as an id collides under rapid posts. Replaced
with a sequential `max(id) + 1` computed inside the serialized write.

## Other cleanups

- Split `src/app.js` (testable Express app) from `src/index.js` (bootstrap),
  which is what let `supertest` cover the routes.
- `kill-port` is now dev-only — it terminates whatever process holds the port,
  which shouldn't happen in production or CI. Opt out with `SKIP_KILL_PORT=true`.
- `dotenv` is actually loaded now; it was a declared dependency that was never
  called.
- Removed unused frontend deps: `axios`, `dotenv`, and `react-scripts` (CRA
  tooling in a Vite project, whose `react-scripts test` script could not have
  worked). 1237 packages pruned. `expect-dotenv` is kept — `vite.config.js`
  imports it.
- Fixed the production static-file branch, which pointed at a non-existent
  `client/build` via two different base paths.
- Inline SVG favicon replaces the `%PUBLIC_URL%/favicon.ico` 404.
- Added `/api/health`.

## Tests

31 backend tests (`npm test`) covering pagination, offset windows, search,
category filtering, sorting in both directions, cache-immutability under sort,
validation rejections, id parsing, the concurrent-write case, stats caching and
facets, and the error-response contract.

## Known gaps

- **No frontend test runner.** Removing `react-scripts` left the frontend
  without one; Vitest + Testing Library would be the natural addition, and the
  highest-value cases are the abort-on-unmount behaviour and the debounce.
- **`src/config/appConfig.js` is still dead code** — nothing imports it, and its
  `version` disagrees with `package.json`. Left in place rather than deleted
  since it may be intended for future use.
- **Search is a linear scan per request.** Fine at 5k items given the cached
  parse; a real dataset wants an index or a database.
- **`mtimeMs` cache invalidation** can theoretically miss two writes within the
  same filesystem timestamp tick. Writes made through the API update the cache
  directly, so this only affects rapid external edits.
- **Single-process cache.** Behind multiple workers each would hold its own copy.
