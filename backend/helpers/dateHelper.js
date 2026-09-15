/**
 * Date and Timestamp Helpers
 */

export function getTodayDateString() {
  return new Date().toISOString().split('T')[0];
}

export function formatHumanDateTime(date = new Date()) {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function isPastDate(dateString) {
  if (!dateString) return false;
  return new Date(dateString) < new Date();
}

export default {
  getTodayDateString,
  formatHumanDateTime,
  isPastDate
};
