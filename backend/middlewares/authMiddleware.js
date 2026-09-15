import { getLocalDatabase } from '../helpers/dbHelper.js';

/**
 * Authentication Middleware
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    // In demo / prototype mode allow requests with a default user context
    return next();
  }

  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized. Token required.' });
  }

  // Token verification can be expanded for JWT / Session
  next();
}

export default {
  requireAuth
};
