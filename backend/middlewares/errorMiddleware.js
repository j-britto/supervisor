import { sendSystemAlert } from '../services/alertService.js';

/**
 * Centralized Error Handling Middleware
 */
export function errorHandler(err, req, res, next) {
  console.error(`[API Error] ${req.method} ${req.originalUrl}:`, err);

  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);

  // If server error (500+), automatically alert admins via email
  if (statusCode >= 500) {
    sendSystemAlert({
      alertType: 'APPLICATION_SERVER_ERROR',
      severity: 'HIGH',
      title: `Server 500 Error at ${req.method} ${req.originalUrl}`,
      message: `An unhandled error occurred during request processing: ${err.message}`,
      error: err,
      metadata: {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        statusCode
      }
    }).catch(alertErr => {
      console.error('[Error Middleware] Failed sending alert:', alertErr.message);
    });
  }
  
  res.status(statusCode).json({
    success: false,
    error: err.message || 'An unexpected internal server error occurred.',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
}

/**
 * 404 Route Not Found Middleware
 */
export function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString()
  });
}

export default {
  errorHandler,
  notFoundHandler
};
