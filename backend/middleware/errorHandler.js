/**
 * Centralized Express Error Handling Middleware.
 * Catches all uncaught sync and async errors across controllers and routes.
 */
function errorHandler(err, req, res, next) {
  console.error("❌ API Error:", {
    path: req.originalUrl,
    method: req.method,
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined
  });

  const statusCode = err.statusCode || res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode === 200 ? 500 : statusCode).json({
    success: false,
    error: err.name || "ServerError",
    message: err.message || "An unexpected error occurred on the server.",
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {})
  });
}

module.exports = errorHandler;
