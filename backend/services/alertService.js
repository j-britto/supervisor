import 'dotenv/config';
import { sendEmail } from './emailService.js';
import { getLocalDatabase, saveLocalDatabase } from '../helpers/dbHelper.js';

// Alert throttle state to prevent inbox flood while guaranteeing notification
const alertThrottle = new Map();
const THROTTLE_WINDOW_MS = 60 * 1000; // 1 minute per alert category

/**
 * Get all registered administrator emails for emergency dispatches
 */
export function getAdminEmails() {
  const emails = new Set();

  try {
    const db = getLocalDatabase();
    if (db && Array.isArray(db.admins)) {
      db.admins.forEach(admin => {
        if (admin && admin.email && typeof admin.email === 'string') {
          const e = admin.email.trim();
          if (e.includes('@')) emails.add(e);
        }
      });
    }
  } catch (err) {
    console.error('[AlertService] Error reading admins from DB:', err.message);
  }

  // Fallbacks from environment or standard admin emails
  if (process.env.ADMIN_ALERT_EMAIL) {
    process.env.ADMIN_ALERT_EMAIL.split(',').forEach(e => {
      if (e.trim().includes('@')) emails.add(e.trim());
    });
  }

  // Add primary system email if configured
  if (process.env.EMAIL_USER && process.env.EMAIL_USER.includes('@')) {
    emails.add(process.env.EMAIL_USER.trim());
  }

  // Default system admin emails
  emails.add('vasanthi@studypulse.edu');
  emails.add('rajgovindha165@gmail.com');

  return Array.from(emails);
}

/**
 * Log incident to local DB security alerts store
 */
function recordAlertInDatabase(alertData) {
  try {
    const db = getLocalDatabase();
    if (!db.securityAlerts) {
      db.securityAlerts = [];
    }
    db.securityAlerts.unshift({
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...alertData,
      loggedAt: new Date().toISOString()
    });

    // Keep last 100 alert records
    if (db.securityAlerts.length > 100) {
      db.securityAlerts = db.securityAlerts.slice(0, 100);
    }
    saveLocalDatabase(db);
  } catch (err) {
    console.error('[AlertService] Could not persist alert to DB:', err.message);
  }
}

/**
 * Format an HTML Emergency Alert Email
 */
function formatAlertHtml({ alertType, severity, title, message, error, metadata, timestamp }) {
  const severityColors = {
    CRITICAL: { bg: '#dc2626', border: '#b91c1c', text: '#ffffff', badgeBg: '#fee2e2', badgeText: '#991b1b' },
    HIGH: { bg: '#ea580c', border: '#c2410c', text: '#ffffff', badgeBg: '#ffedd5', badgeText: '#9a3412' },
    WARNING: { bg: '#d97706', border: '#b45309', text: '#ffffff', badgeBg: '#fef3c7', badgeText: '#92400e' }
  };

  const currentSev = severityColors[severity] || severityColors.CRITICAL;

  const errorDetailsHtml = error ? `
    <div style="margin-top: 16px; background-color: #0f172a; border-radius: 8px; padding: 14px; border: 1px solid #334155;">
      <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Error / Trace:</p>
      <pre style="margin: 0; font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #f87171; white-space: pre-wrap; word-break: break-all;">${typeof error === 'object' ? (error.stack || error.message || JSON.stringify(error, null, 2)) : String(error)}</pre>
    </div>
  ` : '';

  const metadataHtml = metadata && Object.keys(metadata).length > 0 ? `
    <div style="margin-top: 16px; background-color: #f8fafc; border-radius: 8px; padding: 14px; border: 1px solid #e2e8f0;">
      <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Diagnostic Context:</p>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        ${Object.entries(metadata).map(([key, val]) => `
          <tr>
            <td style="padding: 4px 8px 4px 0; font-weight: 600; color: #475569; width: 140px; vertical-align: top;">${key}:</td>
            <td style="padding: 4px 0; color: #1e293b; word-break: break-all; font-family: monospace;">${typeof val === 'object' ? JSON.stringify(val) : String(val)}</td>
          </tr>
        `).join('')}
      </table>
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>CRITICAL SYSTEM ALERT</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px 12px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4); border: 2px solid ${currentSev.bg};">
    
    <!-- Header Banner -->
    <div style="background-color: ${currentSev.bg}; color: #ffffff; padding: 20px 24px;">
      <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.25); color: #ffffff; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 3px 8px; border-radius: 4px; letter-spacing: 0.8px; margin-bottom: 8px;">
        ${severity} ALERT • ${alertType}
      </div>
      <h1 style="margin: 0; font-size: 20px; font-weight: 800; line-height: 1.3;">${title}</h1>
      <p style="margin: 6px 0 0 0; font-size: 12px; opacity: 0.9; color: #ffffff;">StudyPulse AI PSMS Production Guardian</p>
    </div>

    <!-- Alert Content Body -->
    <div style="padding: 24px;">
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 16px;">
        <p style="margin: 0; font-size: 14px; font-weight: 600; color: #991b1b; line-height: 1.5;">${message}</p>
      </div>

      <div style="font-size: 13px; color: #475569; line-height: 1.6;">
        <p style="margin: 0 0 6px 0;"><strong>Incident Time:</strong> ${timestamp} (UTC)</p>
        <p style="margin: 0 0 6px 0;"><strong>System Status:</strong> Automatic failover &amp; safety shields engaged.</p>
      </div>

      ${errorDetailsHtml}
      ${metadataHtml}

      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
        <p style="margin: 0;"><strong>Recommended Action:</strong> Inspect server logs and security dashboard immediately. Contact the administrator team if service interruption persists.</p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 14px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8;">
      StudyPulse AI Automated Incident Alerting Service • Real-Time Health & Security Shield
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Dispatch system alert to all admins via email and log
 */
export async function sendSystemAlert({
  alertType = 'SYSTEM_ERROR',
  severity = 'CRITICAL',
  title,
  message,
  error = null,
  metadata = {}
}) {
  const timestamp = new Date().toISOString();
  const alertKey = `${alertType}:${title}`;
  const now = Date.now();

  // Throttle check
  const lastSent = alertThrottle.get(alertKey) || 0;
  if (now - lastSent < THROTTLE_WINDOW_MS && severity !== 'CRITICAL') {
    console.warn(`[AlertService] Throttled duplicate alert: ${alertKey}`);
    return { sent: false, throttled: true };
  }
  alertThrottle.set(alertKey, now);

  const adminEmails = getAdminEmails();
  const formattedHtml = formatAlertHtml({
    alertType,
    severity,
    title,
    message,
    error,
    metadata,
    timestamp
  });

  const textBody = `
[STUDYPULSE AI - ${severity} ALERT]
Incident: ${title}
Type: ${alertType}
Time: ${timestamp}
Message: ${message}
Error: ${error ? (error.message || String(error)) : 'N/A'}
Metadata: ${JSON.stringify(metadata, null, 2)}
  `.trim();

  // Record to DB
  recordAlertInDatabase({
    alertType,
    severity,
    title,
    message,
    error: error ? (error.message || String(error)) : null,
    metadata,
    recipients: adminEmails
  });

  console.error(`\n🚨 [SYSTEM ALERT TRIGGERED] [${severity}] ${title} -> Disagreeing to ${adminEmails.join(', ')}`);

  // Send to all administrators
  const dispatchPromises = adminEmails.map(toEmail =>
    sendEmail({
      to: toEmail,
      subject: `🚨 [ALERT - ${severity}] ${title} - StudyPulse AI`,
      text: textBody,
      html: formattedHtml
    }).catch(sendErr => {
      console.error(`[AlertService] Failed sending to ${toEmail}:`, sendErr.message);
      return { success: false, error: sendErr.message };
    })
  );

  const results = await Promise.allSettled(dispatchPromises);
  return {
    sent: true,
    recipients: adminEmails,
    results
  };
}

/**
 * Handler for Database Connection Cut / Disconnection
 */
export async function handleDatabaseDisconnect(error, details = {}) {
  console.error('[AlertService] Database connection severed:', error);
  return sendSystemAlert({
    alertType: 'DATABASE_DISCONNECTED',
    severity: 'CRITICAL',
    title: 'Database Connection Cut / Unreachable',
    message: 'The application lost connectivity to the primary database. Automatic resilient fallback mode has been engaged.',
    error,
    metadata: {
      component: 'Database Engine',
      database: 'Oracle SQL / Primary Database',
      ...details
    }
  });
}

/**
 * Handler for Application Crash / Uncaught Errors
 */
export async function handleApplicationCrash(error, context = 'uncaughtException') {
  console.error(`[AlertService] Fatal Application Crash (${context}):`, error);
  return sendSystemAlert({
    alertType: 'APPLICATION_CRASH',
    severity: 'CRITICAL',
    title: `Application Crash Detected (${context})`,
    message: `A fatal runtime error caused the server process or request worker to crash. Error context: ${context}.`,
    error,
    metadata: {
      context,
      nodeVersion: process.version,
      platform: process.platform,
      memoryUsage: process.memoryUsage()
    }
  });
}

/**
 * Handler for Server Down / Shutdown
 */
export async function handleServerShutdown(signal, details = {}) {
  console.warn(`[AlertService] Server shutdown triggered by signal: ${signal}`);
  return sendSystemAlert({
    alertType: 'SERVER_SHUTDOWN',
    severity: 'HIGH',
    title: `Server Shutdown Initiated (${signal})`,
    message: `The StudyPulse AI server instance received termination signal ${signal} and is closing active connection listeners.`,
    metadata: {
      signal,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      ...details
    }
  });
}

/**
 * Handler for Hacking Attacks / Malicious Intrusions
 */
export async function handleSecurityIncident(attackType, details = {}, req = null) {
  console.error(`[AlertService] ⚠️ Security/Hacking Incident Detected: ${attackType}`);
  
  const reqMetadata = req ? {
    ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.headers['user-agent'],
    referer: req.headers['referer']
  } : {};

  return sendSystemAlert({
    alertType: 'SECURITY_ATTACK_DETECTED',
    severity: 'CRITICAL',
    title: `Security Attack / Malicious Attempt Detected: ${attackType}`,
    message: `A potential security intrusion or malicious payload was intercepted and neutralized by the application firewall.`,
    metadata: {
      attackType,
      ...reqMetadata,
      ...details
    }
  });
}

export default {
  getAdminEmails,
  sendSystemAlert,
  handleDatabaseDisconnect,
  handleApplicationCrash,
  handleServerShutdown,
  handleSecurityIncident
};
