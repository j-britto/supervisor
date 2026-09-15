import { isValidEmail } from '../helpers/validationHelper.js';
import { validationErrorResponse } from '../helpers/responseHelper.js';

export function validateEmailRequest(req, res, next) {
  const { to, subject, text, message, html } = req.body;
  const errors = [];

  const recipient = (to || '').trim();
  if (!recipient) {
    errors.push('Recipient email ("to") is required.');
  } else if (!isValidEmail(recipient)) {
    errors.push('Invalid recipient email format.');
  }

  if (!(subject || '').trim()) {
    errors.push('Email subject is required.');
  }

  if (!(text || message || html || '').trim()) {
    errors.push('Email content (text or html body) is required.');
  }

  if (errors.length > 0) {
    return validationErrorResponse(res, errors[0], errors);
  }

  next();
}

export default {
  validateEmailRequest
};
