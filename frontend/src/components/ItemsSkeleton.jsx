import React from 'react';

/** Placeholder rows shown during the first load, matching the real row layout. */
export function ItemsSkeleton({ rows = 8 }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div className="row row--skeleton" key={index}>
          <span className="sk sk--id" />
          <span className="sk sk--name" style={{ width: `${38 + ((index * 13) % 26)}%` }} />
          <span className="sk sk--category" />
          <span className="sk sk--price" />
        </div>
      ))}
    </div>
  );
}
