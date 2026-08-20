const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const itemsRouter = require('./routes/items');
const statsRouter = require('./routes/stats');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// The frontend dev server's origin — not the backend's own port.
// In dev the Vite proxy makes /api same-origin anyway; this covers direct calls.
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '100kb' }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/items', itemsRouter);
app.use('/api/stats', statsRouter);

// Serve the built frontend in production.
if (process.env.NODE_ENV === 'production') {
  const buildDir = path.resolve(__dirname, '../../frontend/build');
  app.use(express.static(buildDir));
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(buildDir, 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
