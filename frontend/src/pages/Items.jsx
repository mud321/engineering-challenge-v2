import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FixedSizeList } from 'react-window';
import { useData } from '../state/DataContext';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useElementSize } from '../hooks/useElementSize';
import { useListParams } from '../hooks/useListParams';
import { useStats } from '../hooks/useStats';
import { ItemsSkeleton } from '../components/ItemsSkeleton';
import { Pagination } from '../components/Pagination';
import { StatsBar } from '../components/StatsBar';
import { Toolbar } from '../components/Toolbar';
import { Highlight } from '../components/Highlight';

const ROW_HEIGHT = 68;

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

// react-window's inner container directly wraps the rows, so `role="list"`
// belongs here for the listitem children to be valid.
const ListInner = React.forwardRef(function ListInner(props, ref) {
  return <div ref={ref} role="list" {...props} />;
});

function ItemRow({ index, style, data }) {
  const { items, query, activeIndex, onFocus, search } = data;
  const item = items[index];

  return (
    <div style={style} className="row" role="listitem">
      <Link
        className={`row__link${index === activeIndex ? ' row__link--active' : ''}`}
        to={`/items/${item.id}`}
        // Hand the current query string to the detail page so its back link
        // returns to this exact search and page.
        state={{ search }}
        tabIndex={index === activeIndex ? 0 : -1}
        onFocus={() => onFocus(index)}
      >
        <span className="row__index" aria-hidden="true">
          {item.id}
        </span>

        <span className="row__name">
          <Highlight text={item.name} query={query} />
        </span>

        <span className="row__category">
          <Highlight text={item.category} query={query} />
        </span>

        <span className="row__price">{currency.format(item.price)}</span>

        <span className="row__chevron" aria-hidden="true">
          →
        </span>
      </Link>
    </div>
  );
}

function Items() {
  const { items, total, totalPages, loading, error, hasLoaded, fetchItems } = useData();
  const { params, setParams, reset, isFiltered } = useListParams();
  const stats = useStats();
  const location = useLocation();

  // The input is local so typing stays instant; the URL updates once the
  // debounced value settles.
  const [search, setSearch] = useState(params.q);
  const debouncedSearch = useDebouncedValue(search, 300);
  const [listRef, { height }] = useElementSize();
  const [activeIndex, setActiveIndex] = useState(-1);
  const listApi = useRef(null);

  // Adopt back/forward navigation that changed `q` behind our back.
  const lastAppliedQ = useRef(params.q);
  useEffect(() => {
    if (params.q !== lastAppliedQ.current && params.q !== debouncedSearch) {
      lastAppliedQ.current = params.q;
      setSearch(params.q);
    }
  }, [params.q, debouncedSearch]);

  useEffect(() => {
    if (debouncedSearch === params.q) return;
    lastAppliedQ.current = debouncedSearch;
    // `replace` keeps every keystroke out of the browser's history stack.
    setParams({ q: debouncedSearch }, { replace: true });
  }, [debouncedSearch, params.q, setParams]);

  useEffect(() => {
    const controller = new AbortController();

    fetchItems({ ...params, signal: controller.signal });
    setActiveIndex(-1);

    // Aborting is what actually prevents the post-unmount setState: the request
    // state lives in the provider, so a local flag here could never guard it.
    return () => controller.abort();
  }, [fetchItems, params]);

  const goToPage = useCallback(
    (page) => {
      setParams({ page });
      listApi.current?.scrollTo(0);
    },
    [setParams],
  );

  // Roving tabindex: ↑/↓ move through rows, Home/End jump to the ends.
  const onListKeyDown = useCallback(
    (event) => {
      const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
      const jump = { Home: 0, End: items.length - 1 }[event.key];

      if (step === undefined && jump === undefined) return;
      event.preventDefault();

      const next =
        jump !== undefined
          ? jump
          : Math.min(Math.max((activeIndex === -1 ? 0 : activeIndex) + step, 0), items.length - 1);

      setActiveIndex(next);
      listApi.current?.scrollToItem(next, 'smart');
    },
    [activeIndex, items.length],
  );

  // Move DOM focus after the row exists — react-window may have just mounted it.
  useEffect(() => {
    if (activeIndex < 0) return;
    const frame = requestAnimationFrame(() => {
      document.querySelector('.row__link--active')?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [activeIndex]);

  const showSkeleton = loading && !hasLoaded;
  const showEmpty = hasLoaded && !loading && !error && items.length === 0;
  const rangeStart = (params.page - 1) * params.limit + 1;
  const rangeEnd = Math.min(params.page * params.limit, total);

  return (
    <main className="page">
      <header className="page__head">
        <div>
          <h1 className="page__title">Item catalogue</h1>
          <p className="page__lede">Browse, search, and filter the full inventory.</p>
        </div>
      </header>

      <StatsBar stats={stats} />

      <Toolbar
        search={search}
        onSearchChange={setSearch}
        category={params.category}
        categories={stats?.categories ?? []}
        onCategoryChange={(category) => setParams({ category })}
        sortValue={`${params.sort}:${params.order}`}
        onSortChange={(value) => {
          const [sort, order] = value.split(':');
          setParams({ sort, order });
        }}
        busy={loading && hasLoaded}
      />

      <div className="resultbar">
        <p className="resultbar__count" role="status">
          {error
            ? 'Could not load items'
            : !hasLoaded
              ? 'Loading…'
              : total === 0
                ? 'No results'
                : `${rangeStart.toLocaleString()}–${rangeEnd.toLocaleString()} of ${total.toLocaleString()}`}
        </p>

        {isFiltered && (
          <div className="chips">
            {params.q && (
              <button type="button" className="chip" onClick={() => setSearch('')}>
                “{params.q}” <span aria-hidden="true">✕</span>
                <span className="sr-only">Clear search</span>
              </button>
            )}
            {params.category && (
              <button type="button" className="chip" onClick={() => setParams({ category: '' })}>
                {params.category} <span aria-hidden="true">✕</span>
                <span className="sr-only">Clear category filter</span>
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="alert" role="alert">
          <span>{error}</span>
          <button type="button" className="button" onClick={() => fetchItems(params)}>
            Try again
          </button>
        </div>
      )}

      <div
        className="viewport"
        ref={listRef}
        onKeyDown={onListKeyDown}
        aria-busy={loading || undefined}
      >
        {showSkeleton && <ItemsSkeleton rows={Math.max(1, Math.floor(height / ROW_HEIGHT) || 8)} />}

        {showEmpty && (
          <div className="empty">
            <p className="empty__title">Nothing matches those filters</p>
            <p className="empty__body">
              {params.q && <>No item names or categories contain “{params.q}”. </>}
              Try a broader term or clear what you have applied.
            </p>
            <button
              type="button"
              className="button button--primary"
              onClick={() => {
                setSearch('');
                reset();
              }}
            >
              Clear all filters
            </button>
          </div>
        )}

        {!showSkeleton && items.length > 0 && height > 0 && (
          // Only the visible rows are mounted, so page size can grow freely.
          <FixedSizeList
            ref={listApi}
            height={height}
            width="100%"
            itemCount={items.length}
            itemSize={ROW_HEIGHT}
            itemData={{
              items,
              query: params.q,
              activeIndex,
              onFocus: setActiveIndex,
              search: location.search,
            }}
            overscanCount={6}
            innerElementType={ListInner}
          >
            {ItemRow}
          </FixedSizeList>
        )}
      </div>

      <Pagination
        page={params.page}
        totalPages={totalPages}
        limit={params.limit}
        disabled={loading}
        onChange={goToPage}
        onLimitChange={(limit) => setParams({ limit })}
      />
    </main>
  );
}

export default Items;
