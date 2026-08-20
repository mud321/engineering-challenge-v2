import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Items from './Items';
import ItemDetail from './ItemDetail';
import { DataProvider } from '../state/DataContext';

function NotFound() {
  return (
    <main className="page">
      <h1 className="page__title">Page not found</h1>
      <p className="page__lede">That address doesn’t match anything in the catalogue.</p>
      <p style={{ marginTop: 16 }}>
        <Link className="button button--primary" to="/">
          Back to items
        </Link>
      </p>
    </main>
  );
}

function App() {
  return (
    <DataProvider>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <nav className="nav" aria-label="Primary">
        <Link className="nav__brand" to="/">
          <span className="nav__mark" aria-hidden="true">
            ◧
          </span>
          Catalogue
        </Link>
      </nav>

      <div id="main">
        <Routes>
          <Route path="/" element={<Items />} />
          <Route path="/items/:id" element={<ItemDetail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </DataProvider>
  );
}

export default App;
