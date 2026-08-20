import React, { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function ItemDetail() {
  const { id } = useParams();
  const location = useLocation();
  const [item, setItem] = useState(null);
  const [error, setError] = useState(null);

  // Carry the list's query string back so returning preserves search and page.
  const backTo = { pathname: '/', search: location.state?.search ?? '' };

  useEffect(() => {
    const controller = new AbortController();
    setItem(null);
    setError(null);

    fetch(`/api/items/${id}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error?.message ?? `Request failed with status ${res.status}`);
        }
        return res.json();
      })
      .then(setItem)
      .catch((err) => {
        // Surface the failure — a dropped request is not a missing item, so
        // silently redirecting would hide a real problem.
        if (err.name !== 'AbortError') setError(err.message);
      });

    return () => controller.abort();
  }, [id]);

  return (
    <main className="page">
      <Link className="back" to={backTo}>
        <span aria-hidden="true">←</span> Back to items
      </Link>

      {error && (
        <div className="alert" role="alert">
          <span>{error}</span>
          <Link className="button" to={backTo}>
            Back to items
          </Link>
        </div>
      )}

      {!error && !item && (
        <div className="card" aria-busy="true">
          <span className="sk" style={{ display: 'block', width: '45%', height: 22 }} />
          <span className="sk" style={{ display: 'block', width: 140, height: 30, marginTop: 12 }} />
        </div>
      )}

      {item && (
        <article className="card">
          <h1 className="page__title">{item.name}</h1>
          <p className="card__price">{currency.format(item.price)}</p>

          <dl className="meta">
            <div>
              <dt>Category</dt>
              <dd>{item.category}</dd>
            </div>
            <div>
              <dt>Item ID</dt>
              <dd>{item.id}</dd>
            </div>
          </dl>
        </article>
      )}
    </main>
  );
}

export default ItemDetail;
