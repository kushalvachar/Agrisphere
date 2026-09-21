// middleware/errorHandler.js — single place that formats all errors.
export function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Something went wrong on the server.',
  });
}
