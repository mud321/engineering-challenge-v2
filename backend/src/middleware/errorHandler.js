function notFound(req, res) {
  res.status(404).json({ error: { message: `Cannot ${req.method} ${req.originalUrl}` } });
}

// eslint-disable-next-line no-unused-vars -- Express identifies handlers by arity
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({
    error: {
      // Never surface an internal message (or the filesystem paths inside it).
      message: status >= 500 ? 'Internal server error' : err.message,
      ...(process.env.NODE_ENV !== 'production' && status >= 500
        ? { detail: err.message }
        : {}),
    },
  });
}

module.exports = { notFound, errorHandler };
