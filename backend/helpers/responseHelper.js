/**
 * Standardized API Response Helpers
 */

export function successResponse(res, data = null, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
}

export function errorResponse(res, error = 'An error occurred', statusCode = 500, details = null) {
  return res.status(statusCode).json({
    success: false,
    error: typeof error === 'string' ? error : error.message || 'Internal Server Error',
    details,
    timestamp: new Date().toISOString()
  });
}

export function validationErrorResponse(res, message = 'Validation error', errors = []) {
  return res.status(400).json({
    success: false,
    error: message,
    validationErrors: errors,
    timestamp: new Date().toISOString()
  });
}

export default {
  successResponse,
  errorResponse,
  validationErrorResponse
};
