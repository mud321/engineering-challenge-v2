import React from 'react';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Marks occurrences of `query` inside `text` without altering the casing shown. */
export function Highlight({ text, query }) {
  const needle = query?.trim();
  if (!needle) return text;

  const parts = String(text).split(new RegExp(`(${escapeRegExp(needle)})`, 'gi'));

  return parts.map((part, index) =>
    part.toLowerCase() === needle.toLowerCase() ? (
      <mark className="highlight" key={index}>
        {part}
      </mark>
    ) : (
      part
    ),
  );
}
