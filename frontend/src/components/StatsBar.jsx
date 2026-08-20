import React from 'react';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function Tile({ label, value, pending }) {
  return (
    <div className="tile">
      <span className="tile__label">{label}</span>
      <span className={`tile__value${pending ? ' tile__value--pending' : ''}`}>
        {pending ? '—' : value}
      </span>
    </div>
  );
}

export function StatsBar({ stats }) {
  const pending = !stats;

  return (
    <div className="stats" aria-label="Catalogue summary">
      <Tile label="Items" value={stats?.total?.toLocaleString()} pending={pending} />
      <Tile label="Average price" value={currency.format(stats?.averagePrice ?? 0)} pending={pending} />
      <Tile
        label="Price range"
        value={`${currency.format(stats?.minPrice ?? 0)} – ${currency.format(stats?.maxPrice ?? 0)}`}
        pending={pending}
      />
      <Tile label="Categories" value={stats?.categories?.length} pending={pending} />
    </div>
  );
}
