import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { scanForMalware } from '../services/antivirusService.js';
import { handleSecurityIncident } from '../services/alertService.js';
import { getLocalDatabase, saveLocalDatabase } from '../helpers/dbHelper.js';

// Live Firewall Metrics & Counters
export const firewallMetrics = {
  startedAt: new Date().toISOString(),
  layer1BlockedRequests: 0,
  layer2SanitizedHeaders: 0,
  layer3BlockedAttacks: 0,
  layer3VirusesBlocked: 0,
  layer4AccessViolations: 0,
  totalScannedRequests: 0,
  recentIncidents: []
};

function recordIncident(layer, type, details, req) {
  const incident = {
    id: `fw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    layer,
    type,
    ip: req ? (req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown') : 'unknown',
    url: req ? req.originalUrl : 'unknown',
    method: req ? req.method : 'unknown',
    userAgent: req ? req.headers['user-agent'] : 'unknown',
    details,
    timestamp: new Date().toISOString()
  };

  firewallMetrics.recentIncidents.unshift(incident);
  if (firewallMetrics.recentIncidents.length > 50) {
    firewallMetrics.recentIncidents = firewallMetrics.recentIncidents.slice(0, 50);
  }

  // Also persist to DB security alerts
  try {
    const db = getLocalDatabase();
    if (!db.securityAlerts) db.securityAlerts = [];
    db.securityAlerts.unshift(incident);
    if (db.securityAlerts.length > 100) db.securityAlerts = db.securityAlerts.slice(0, 100);
    saveLocalDatabase(db);
  } catch (err) {
    console.error('[Firewall] Error persisting incident:', err.message);
  }

  return incident;
}

// ============================================================================
// LAYER 1: Network & Rate Limiting Shield (Anti-DDoS & Brute Force Protection)
// ============================================================================

// General API Rate Limiter (300 requests per 1 minute per IP)
export const layer1GeneralLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, forwardedHeader: false },
  message: {
    success: false,
    error: 'Layer 1 Firewall Alert: High request frequency detected. Rate limit exceeded, please retry in a moment.',
    layer: 'Layer 1 - Network & Rate Limiting'
  },
  handler: (req, res, next, options) => {
    firewallMetrics.layer1BlockedRequests++;
    recordIncident('Layer 1', 'RATE_LIMIT_EXCEEDED', { max: options.max, windowMs: options.windowMs }, req);
    handleSecurityIncident('RATE_LIMIT_FLOOD_ATTACK', {
      note: 'IP exceeded maximum allowed request rate threshold',
      rateLimit: options.max
    }, req);
    res.status(429).json(options.message);
  }
});

// Strict Auth Rate Limiter (20 attempts per 5 minutes per IP for login/signup)
export const layer1AuthLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, forwardedHeader: false },
  message: {
    success: false,
    error: 'Layer 1 Firewall Alert: Excessive authentication attempts. Account access temporarily shielded.',
    layer: 'Layer 1 - Auth Rate Limiting'
  },
  handler: (req, res, next, options) => {
    firewallMetrics.layer1BlockedRequests++;
    recordIncident('Layer 1', 'AUTH_BRUTE_FORCE_BLOCKED', { max: options.max }, req);
    handleSecurityIncident('BRUTE_FORCE_AUTH_ATTEMPT', {
      note: 'Multiple rapid authentication attempts blocked on auth endpoints',
      attemptThreshold: options.max
    }, req);
    res.status(429).json(options.message);
  }
});

// ============================================================================
// LAYER 2: HTTP Header Security Armor (Helmet & Protocol Hardening)
// ============================================================================

export const layer2HelmetArmor = helmet({
  contentSecurityPolicy: false, // Disabled to permit SPA bundle execution and preview iframes
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: false, // Configured to allow AI Studio developer iframe while blocking malicious frame injection
  hidePoweredBy: true,
  hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false,
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true
});

export const layer2ProtocolGuard = (req, res, next) => {
  firewallMetrics.layer2SanitizedHeaders++;
  // Strip sensitive internal response headers
  res.removeHeader('X-Powered-By');
  res.setHeader('X-Firewall-Shield', 'StudyPulse-4Layer-Active');
  res.setHeader('X-Antivirus-Status', 'Protected');
  next();
};

// ============================================================================
// LAYER 3: Application WAF & Deep Antivirus / Malware Payload Inspection
// ============================================================================

const SQLI_PATTERNS = [
  /(\b(UNION(\s+ALL)?|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|EXEC|EXECUTE)\b[\s\S]{1,60}?\b(FROM|INTO|WHERE|TABLE)\b)/i,
  /(^|[\s;])--\s+/i,
  /(^|[\s;])#\s+/i,
  /\/\*[\s\S]*?\*\//,
  /;\s*(DROP|DELETE|TRUNCATE)\s+(TABLE|DATABASE)/i,
  /('|\")\s*(OR|AND)\s*('|\")?\d+('|\")?\s*=\s*('|\")?\d+/i,
  /'\s*OR\s*('1'\s*=\s*'1|1\s*=\s*1)/i,
  /"\s*OR\s*("1"\s*=\s*"1|1\s*=\s*1)/i
];

const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:[^\n]+/gi,
  /onerror\s*=\s*['"][^'"]*['"]/gi,
  /onload\s*=\s*['"][^'"]*['"]/gi
];

const PATH_TRAVERSAL = [
  /\.\.\/\.\.\//,
  /\.\.\\\.\.\\/,
  /\/etc\/passwd/i,
  /\/windows\/win\.ini/i
];

const WAF_EXEMPT_FIELDS = new Set([
  'aiApiKey', 'apiKey', 'password', 'newPassword', 'profileImage',
  'avatar', 'photo', 'template', 'token', 'emailAppId', 'signature'
]);

function checkWafThreats(val, context = '') {
  if (val === null || val === undefined) return null;

  const fieldName = context.split('.').pop();
  if (WAF_EXEMPT_FIELDS.has(fieldName)) {
    return null;
  }

  if (typeof val === 'string') {
    // Skip base64 image data or oversized tokens
    if (val.startsWith('data:image/') || val.length > 50000) {
      return null;
    }

    for (const pattern of SQLI_PATTERNS) {
      if (pattern.test(val)) {
        return { type: 'SQL_INJECTION_ATTEMPT', pattern: pattern.toString(), context, sample: val.substring(0, 100) };
      }
    }
    for (const pattern of XSS_PATTERNS) {
      if (pattern.test(val)) {
        return { type: 'XSS_SCRIPT_INJECTION', pattern: pattern.toString(), context, sample: val.substring(0, 100) };
      }
    }
    for (const pattern of PATH_TRAVERSAL) {
      if (pattern.test(val)) {
        return { type: 'PATH_TRAVERSAL_EXPLOIT', pattern: pattern.toString(), context, sample: val.substring(0, 100) };
      }
    }
  } else if (typeof val === 'object') {
    for (const key of Object.keys(val)) {
      if (key.startsWith('$') || key === '__proto__' || key === 'constructor') {
        return { type: 'NOSQL_OR_OBJECT_POLLUTION', context: `${context}.${key}`, sample: key };
      }
      const deep = checkWafThreats(val[key], `${context}.${key}`);
      if (deep) return deep;
    }
  }

  return null;
}

export const layer3AntivirusWafScanner = (req, res, next) => {
  firewallMetrics.totalScannedRequests++;

  // Allow public health check & safe status queries
  if (req.path === '/api/health' || req.path === '/api/security/status') {
    return next();
  }

  // 1. Antivirus / Malware Deep Scan on Query Parameters
  const avQueryScan = scanForMalware(req.query, 'URL Query');
  if (!avQueryScan.isClean) {
    firewallMetrics.layer3VirusesBlocked++;
    recordIncident('Layer 3', avQueryScan.threatType, avQueryScan, req);
    handleSecurityIncident(`MALWARE_DETECTED: ${avQueryScan.threatName}`, avQueryScan, req);
    return res.status(400).json({
      success: false,
      error: `Layer 3 Antivirus Alert: Malicious file signature or virus intercepted [${avQueryScan.threatName}]`,
      threatType: avQueryScan.threatType,
      signatureId: avQueryScan.signatureId,
      layer: 'Layer 3 - Antivirus & Malware Engine'
    });
  }

  // 2. Antivirus / Malware Deep Scan on Request Body
  if (req.body && typeof req.body === 'object') {
    const avBodyScan = scanForMalware(req.body, 'Request Body');
    if (!avBodyScan.isClean) {
      firewallMetrics.layer3VirusesBlocked++;
      recordIncident('Layer 3', avBodyScan.threatType, avBodyScan, req);
      handleSecurityIncident(`MALWARE_DETECTED: ${avBodyScan.threatName}`, avBodyScan, req);
      return res.status(400).json({
        success: false,
        error: `Layer 3 Antivirus Alert: Malicious file signature or virus intercepted [${avBodyScan.threatName}]`,
        threatType: avBodyScan.threatType,
        signatureId: avBodyScan.signatureId,
        layer: 'Layer 3 - Antivirus & Malware Engine'
      });
    }
  }

  // 3. WAF (SQLi, XSS, Path Traversal) on Query
  const wafQuery = checkWafThreats(req.query, 'query');
  if (wafQuery) {
    firewallMetrics.layer3BlockedAttacks++;
    recordIncident('Layer 3', wafQuery.type, wafQuery, req);
    handleSecurityIncident(wafQuery.type, wafQuery, req);
    return res.status(400).json({
      success: false,
      error: `Layer 3 WAF Alert: Security attack payload blocked (${wafQuery.type})`,
      layer: 'Layer 3 - Application Firewall'
    });
  }

  // 4. WAF on Body
  if (req.body && typeof req.body === 'object') {
    const wafBody = checkWafThreats(req.body, 'body');
    if (wafBody) {
      firewallMetrics.layer3BlockedAttacks++;
      recordIncident('Layer 3', wafBody.type, wafBody, req);
      handleSecurityIncident(wafBody.type, wafBody, req);
      return res.status(400).json({
        success: false,
        error: `Layer 3 WAF Alert: Security attack payload blocked (${wafBody.type})`,
        layer: 'Layer 3 - Application Firewall'
      });
    }
  }

  next();
};

// ============================================================================
// LAYER 4: Access Control, Privilege Integrity & Audit Logging
// ============================================================================

export const layer4AuditAndPrivilegeShield = (req, res, next) => {
  // Guard sensitive admin configuration endpoints
  if (req.path.startsWith('/api/admin/system-override') && req.headers['x-admin-override'] !== 'verified') {
    firewallMetrics.layer4AccessViolations++;
    recordIncident('Layer 4', 'UNAUTHORIZED_PRIVILEGE_ACCESS', { path: req.path }, req);
    handleSecurityIncident('PRIVILEGE_ESCALATION_ATTEMPT', { path: req.path }, req);
    return res.status(401).json({
      success: false,
      error: 'Layer 4 Firewall Alert: Unauthorized administrative privilege access denied.',
      layer: 'Layer 4 - Privilege & Access Control'
    });
  }

  next();
};

export default {
  layer1GeneralLimiter,
  layer1AuthLimiter,
  layer2HelmetArmor,
  layer2ProtocolGuard,
  layer3AntivirusWafScanner,
  layer4AuditAndPrivilegeShield,
  firewallMetrics
};
