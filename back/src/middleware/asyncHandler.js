// middleware/asyncHandler.js
// Wraps an async route handler so thrown errors/rejected promises are
// forwarded to Express's error handler instead of crashing the server.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
