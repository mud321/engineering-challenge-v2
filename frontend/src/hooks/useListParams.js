import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export const PAGE_SIZES = [25, 50, 100];

export const SORT_OPTIONS = [
  { value: 'id:asc', label: 'Default order' },
  { value: 'name:asc', label: 'Name (A–Z)' },
  { value: 'name:desc', label: 'Name (Z–A)' },
  { value: 'price:asc', label: 'Price (low to high)' },
  { value: 'price:desc', label: 'Price (high to low)' },
];

const DEFAULTS = { q: '', category: '', sort: 'id', order: 'asc', page: 1, limit: 50 };

/**
 * Keeps the list's query state in the URL so a view is shareable, survives a
 * refresh, and responds to the browser's back and forward buttons.
 */
export function useListParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const params = useMemo(() => {
    const page = Number(searchParams.get('page'));
    const limit = Number(searchParams.get('limit'));

    return {
      q: searchParams.get('q') ?? DEFAULTS.q,
      category: searchParams.get('category') ?? DEFAULTS.category,
      sort: searchParams.get('sort') ?? DEFAULTS.sort,
      order: searchParams.get('order') ?? DEFAULTS.order,
      page: Number.isInteger(page) && page > 0 ? page : DEFAULTS.page,
      limit: PAGE_SIZES.includes(limit) ? limit : DEFAULTS.limit,
    };
  }, [searchParams]);

  const setParams = useCallback(
    (updates, { replace = false } = {}) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);

          for (const [key, value] of Object.entries(updates)) {
            // Defaults stay out of the URL so the common case has a clean address.
            if (value === '' || value === null || value === undefined || value === DEFAULTS[key]) {
              next.delete(key);
            } else {
              next.set(key, String(value));
            }
          }

          // Any change to what's being listed invalidates the page number.
          if (!('page' in updates)) next.delete('page');

          return next;
        },
        { replace },
      );
    },
    [setSearchParams],
  );

  const reset = useCallback(() => setSearchParams(new URLSearchParams()), [setSearchParams]);

  const isFiltered = Boolean(params.q || params.category);

  return { params, setParams, reset, isFiltered };
}
