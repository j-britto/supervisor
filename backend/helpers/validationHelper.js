/**
 * Input Validation Helpers
 */

export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

export function isValidPhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return /^\+?[0-9]{7,15}$/.test(cleaned);
}

export function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.trim();
}

export default {
  isValidEmail,
  isValidPhoneNumber,
  sanitizeString
};
