import React from 'react';
import { PAGE_SIZES } from '../hooks/useListParams';

/**
 * Builds a compact page window: first and last are always reachable, with an
 * ellipsis standing in for the gaps. Prev/Next alone is unusable at 100 pages.
 */
function buildPageList(page, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set([1, totalPages, page, page - 1, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (page >= totalPages - 2) [totalPages - 3, totalPages - 2, totalPages - 1].forEach((p) => pages.add(p));

  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  const withGaps = [];
  sorted.forEach((p, index) => {
    if (index > 0 && p - sorted[index - 1] > 1) withGaps.push(`gap-${p}`);
    withGaps.push(p);
  });

  return withGaps;
}

export function Pagination({ page, totalPages, limit, disabled = false, onChange, onLimitChange }) {
  const pages = totalPages > 1 ? buildPageList(page, totalPages) : [];

  return (
    <div className="pagination-bar">
      <label className="page-size">
        <span className="page-size__label">Per page</span>
        <select
          className="select select--compact"
          value={limit}
          disabled={disabled}
          onChange={(event) => onLimitChange(Number(event.target.value))}
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>

      {totalPages > 1 && (
        <nav className="pagination" aria-label="Pagination">
          <button
            type="button"
            className="page-button page-button--arrow"
            onClick={() => onChange(page - 1)}
            disabled={disabled || page <= 1}
            aria-label="Previous page"
          >
            ←
          </button>

          {pages.map((entry) =>
            typeof entry === 'string' ? (
              <span className="pagination__gap" key={entry} aria-hidden="true">
                …
              </span>
            ) : (
              <button
                type="button"
                key={entry}
                className={`page-button${entry === page ? ' page-button--current' : ''}`}
                onClick={() => onChange(entry)}
                disabled={disabled}
                aria-label={`Page ${entry}`}
                aria-current={entry === page ? 'page' : undefined}
              >
                {entry}
              </button>
            ),
          )}

          <button
            type="button"
            className="page-button page-button--arrow"
            onClick={() => onChange(page + 1)}
            disabled={disabled || page >= totalPages}
            aria-label="Next page"
          >
            →
          </button>
        </nav>
      )}
    </div>
  );
}
