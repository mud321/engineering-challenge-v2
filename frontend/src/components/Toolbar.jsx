import React, { useEffect, useRef } from 'react';
import { SORT_OPTIONS } from '../hooks/useListParams';

export function Toolbar({
  search,
  onSearchChange,
  category,
  categories,
  onCategoryChange,
  sortValue,
  onSortChange,
  busy,
}) {
  const inputRef = useRef(null);

  // "/" focuses search, Escape clears it — the shortcuts users expect from a
  // list view, without hijacking typing in another field.
  useEffect(() => {
    const onKeyDown = (event) => {
      const tag = event.target.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (event.key === '/' && !typing) {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === 'Escape' && event.target === inputRef.current) {
        onSearchChange('');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onSearchChange]);

  return (
    <div className="toolbar">
      <div className="field field--search">
        <label className="sr-only" htmlFor="item-search">
          Search items
        </label>
        <span className="field__icon" aria-hidden="true">
          ⌕
        </span>
        <input
          id="item-search"
          ref={inputRef}
          className="input input--search"
          type="text"
          value={search}
          placeholder="Search items…"
          autoComplete="off"
          spellCheck="false"
          onChange={(event) => onSearchChange(event.target.value)}
        />

        {busy && <span className="field__spinner" aria-hidden="true" />}

        {!busy && search && (
          <button
            type="button"
            className="field__clear"
            onClick={() => {
              onSearchChange('');
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}

        {!busy && !search && (
          <kbd className="field__kbd" aria-hidden="true">
            /
          </kbd>
        )}
      </div>

      <label className="field">
        <span className="sr-only">Filter by category</span>
        <select
          className="select"
          value={category}
          onChange={(event) => onCategoryChange(event.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((entry) => (
            <option key={entry.name} value={entry.name}>
              {entry.name} ({entry.count.toLocaleString()})
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="sr-only">Sort items</span>
        <select
          className="select"
          value={sortValue}
          onChange={(event) => onSortChange(event.target.value)}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
