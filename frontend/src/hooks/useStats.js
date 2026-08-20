import { useEffect, useState } from 'react';

/**
 * Loads the cached /api/stats payload — catalogue totals and the category
 * facets used by the filter. Cheap to call: the server serves it from cache.
 */
export function useStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/stats', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then(setStats)
      // Stats are decorative — a failure here must not break the list.
      .catch(() => {});

    return () => controller.abort();
  }, []);

  return stats;
}
