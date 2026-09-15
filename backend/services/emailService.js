import 'dotenv/config';
import nodemailer from 'nodemailer';

/**
 * Validates an email address format
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
};

/**
 * Gets credentials from environment variables or optional custom fallback
 */
export const getEmailConfig = (customConfig = {}) => {
  const user = customConfig.user || process.env.EMAIL_USER || '';
  const pass = customConfig.pass || process.env.EMAIL_APP_PASSWORD || '';
  const from = customConfig.from || process.env.EMAIL_FROM || user || 'studypulse.notifications@gmail.com';
  return { user, pass, from };
};

/**
 * Creates or retrieves the Nodemailer transporter
 */
export const getTransporter = (customConfig = {}) => {
  const { user, pass } = getEmailConfig(customConfig);

  if (!user || !pass) {
    return null;
  }

  const transporter = nodemailer.createTransport({
    service: process.env.SMTP_SERVICE || 'gmail',
    host: process.env.SMTP_HOST || undefined,
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: user.trim(),
      pass: pass.trim()
    }
  });

  return transporter;
};

/**
 * Verify transporter SMTP connectivity without crashing the server
 */
export const verifyTransporter = async (customConfig = {}) => {
  const { user, pass } = getEmailConfig(customConfig);

  if (!user || !pass) {
    const errorMsg = 'Email service is not configured: EMAIL_USER or EMAIL_APP_PASSWORD missing';
    console.warn(`[StudyPulse Email Service] ⚠️  ${errorMsg}`);
    return { ready: false, message: errorMsg };
  }

  try {
    const transporter = getTransporter(customConfig);
    if (!transporter) {
      return { ready: false, message: 'Could not create email transporter' };
    }

    await transporter.verify();
    console.log(`[StudyPulse Email Service] ✅ Email transporter is ready. Connected as: ${user}`);
    return { ready: true, message: `Email transporter verified successfully for ${user}` };
  } catch (error) {
    console.error('[StudyPulse Email Service] ❌ Transporter verification error:', error.message);
    return { ready: false, message: `SMTP verification failed: ${error.message}` };
  }
};

const escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export const buildStudyPulseEmailTemplate = (subject, messageContent, preformattedHtml = null) => {
  const bodyContent = preformattedHtml || `
    <div style="font-size: 15px; line-height: 1.7; color: #1e293b; white-space: pre-wrap;">${escapeHtml(messageContent)}</div>
  `;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f1f5f9;
      margin: 0;
      padding: 24px 12px;
      color: #1e293b;
    }
    .wrapper {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
      color: #ffffff;
      padding: 28px 24px;
      text-align: left;
    }
    .badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 20px;
      padding: 3px 10px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .header h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.5px;
      color: #ffffff;
    }
    .header p {
      margin: 6px 0 0;
      font-size: 13px;
      color: #bfdbfe;
    }
    .content-area {
      padding: 28px 24px;
    }
    .subject-line {
      font-size: 17px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #f1f5f9;
    }
    .footer {
      background-color: #f8fafc;
      padding: 20px 24px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
    }
    .footer strong {
      color: #334155;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="badge">Academic Dispatch</div>
      <h1>StudyPulse AI</h1>
      <p>Project Supervision &amp; Monitoring System (PSMS)</p>
    </div>
    <div class="content-area">
      <div class="subject-line">${escapeHtml(subject)}</div>
      ${bodyContent}
    </div>
    <div class="footer">
      <p style="margin: 0;"><strong>StudyPulse AI</strong> — Project Supervision &amp; Monitoring System</p>
      <p style="margin: 4px 0 0;">This email was dispatched securely via the automated PSMS notification engine.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
};

export const sendEmail = async ({ to, subject, text = '', html = null, customConfig = {} }) => {
  if (!to || typeof to !== 'string') {
    return {
      success: false,
      error: 'Recipient email address ("to") is required.'
    };
  }

  const trimmedTo = to.trim();
  if (!isValidEmail(trimmedTo)) {
    return {
      success: false,
      error: `Invalid recipient email address: "${trimmedTo}". Please provide a valid email.`
    };
  }

  if (!subject || typeof subject !== 'string' || !subject.trim()) {
    return {
      success: false,
      error: 'Email subject is required.'
    };
  }

  const trimmedSubject = subject.trim();
  if (trimmedSubject.length > 200) {
    return {
      success: false,
      error: 'Email subject exceeds maximum length of 200 characters.'
    };
  }

  const messageBody = text ? text.trim() : '';
  if (!messageBody && !html) {
    return {
      success: false,
      error: 'Email content (message body or html) is required.'
    };
  }

  const transporter = getTransporter(customConfig);
  const { from, user, pass } = getEmailConfig(customConfig);

  if (!transporter || !user || !pass) {
    console.error('[StudyPulse Email Service] Missing credentials. EMAIL_USER and EMAIL_APP_PASSWORD must be configured.');
    return {
      success: false,
      error: 'Email service is not configured. Please set EMAIL_USER and EMAIL_APP_PASSWORD.'
    };
  }

  const fullHtml = html ? html : buildStudyPulseEmailTemplate(trimmedSubject, messageBody);

  try {
    const info = await transporter.sendMail({
      from: `"StudyPulse AI" <${from}>`,
      to: trimmedTo,
      subject: trimmedSubject,
      text: messageBody || 'StudyPulse AI Notification',
      html: fullHtml
    });

    console.log(`[StudyPulse Email Service] ✅ Email dispatched successfully to ${trimmedTo}. Message ID: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId,
      accepted: info.accepted
    };
  } catch (error) {
    console.error(`[StudyPulse Email Service] ❌ Email send failure to ${trimmedTo}:`, error.message);
    return {
      success: false,
      error: error.message || 'Failed to dispatch email via SMTP transporter.'
    };
  }
};

export default {
  isValidEmail,
  getEmailConfig,
  getTransporter,
  verifyTransporter,
  buildStudyPulseEmailTemplate,
  sendEmail
};
