import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const DataContext = createContext(null);

export const PAGE_SIZE = 50;

const INITIAL_STATE = {
  items: [],
  total: 0,
  page: 1,
  limit: PAGE_SIZE,
  totalPages: 0,
  hasMore: false,
  loading: false,
  error: null,
  // Distinguishes "no request has finished yet" from "the request returned
  // nothing" — without it an empty result renders as a permanent spinner.
  hasLoaded: false,
};

export function DataProvider({ children }) {
  const [state, setState] = useState(INITIAL_STATE);

  // Monotonic request id: a slow response that has been superseded is dropped
  // instead of overwriting fresher results out of order.
  const latestRequest = useRef(0);

  const fetchItems = useCallback(async ({
    q = '',
    category = '',
    sort = 'id',
    order = 'asc',
    page = 1,
    limit = PAGE_SIZE,
    signal,
  } = {}) => {
    const requestId = latestRequest.current + 1;
    latestRequest.current = requestId;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      sort,
      order,
    });
    if (q) params.set('q', q);
    if (category) params.set('category', category);

    try {
      // Relative path so the Vite dev proxy handles it — same origin, no CORS.
      const res = await fetch(`/api/items?${params.toString()}`, { signal });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? `Request failed with status ${res.status}`);
      }

      const json = await res.json();
      if (requestId !== latestRequest.current) return null;

      setState({ ...INITIAL_STATE, ...json, loading: false, error: null, hasLoaded: true });
      return json;
    } catch (err) {
      // The caller aborted (unmount, or a newer query) — there is nothing to report.
      if (err.name === 'AbortError') return null;
      if (requestId !== latestRequest.current) return null;

      setState((prev) => ({ ...prev, loading: false, error: err.message, hasLoaded: true }));
      return null;
    }
  }, []);

  const value = useMemo(() => ({ ...state, fetchItems }), [state, fetchItems]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used inside a DataProvider');
  return context;
}
