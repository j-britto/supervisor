import { handleSecurityIncident } from '../services/alertService.js';

// Patterns commonly found in automated attacks, SQLi, XSS, and command injection
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

const EXEMPT_FIELDS = new Set([
  'aiApiKey', 'apiKey', 'password', 'newPassword', 'profileImage',
  'avatar', 'photo', 'template', 'token', 'emailAppId', 'signature'
]);

function checkValueForThreats(val, path = '') {
  if (val === null || val === undefined) return null;
  
  const fieldName = path.split('.').pop();
  if (EXEMPT_FIELDS.has(fieldName)) {
    return null;
  }

  if (typeof val === 'string') {
    if (val.startsWith('data:image/') || val.length > 50000) {
      return null;
    }

    // Check SQLi
    for (const pattern of SQLI_PATTERNS) {
      if (pattern.test(val)) {
        return { type: 'SQL_INJECTION_ATTEMPT', pattern: pattern.toString(), path, sample: val.substring(0, 100) };
      }
    }
    // Check XSS
    for (const pattern of XSS_PATTERNS) {
      if (pattern.test(val)) {
        return { type: 'CROSS_SITE_SCRIPTING_ATTEMPT', pattern: pattern.toString(), path, sample: val.substring(0, 100) };
      }
    }
    // Check Path Traversal
    for (const pattern of PATH_TRAVERSAL) {
      if (pattern.test(val)) {
        return { type: 'PATH_TRAVERSAL_ATTEMPT', pattern: pattern.toString(), path, sample: val.substring(0, 100) };
      }
    }
  } else if (typeof val === 'object') {
    // Check NoSQL operator injection
    for (const key of Object.keys(val)) {
      if (key.startsWith('$') || key === '__proto__' || key === 'constructor') {
        return { type: 'OBJECT_POLLUTION_OR_NOSQL_INJECTION', path: `${path}.${key}`, key };
      }
      const deepCheck = checkValueForThreats(val[key], `${path}.${key}`);
      if (deepCheck) return deepCheck;
    }
  }

  return null;
}

/**
 * Express Security Shield Middleware
 */
export function securityShield(req, res, next) {
  // Allow health & docs endpoints
  if (req.path === '/api/health' || req.path.startsWith('/api/docs')) {
    return next();
  }

  // 1. Inspect URL & Query Parameters
  const queryThreat = checkValueForThreats(req.query, 'query');
  if (queryThreat) {
    handleSecurityIncident(queryThreat.type, {
      threatDetails: queryThreat,
      rawQuery: req.query
    }, req);
    return res.status(400).json({
      success: false,
      error: 'Security Alert: Malicious request signature intercepted by PSMS Guardian.',
      incidentId: `sec_${Date.now()}`
    });
  }

  // 2. Inspect Body Parameters for non-GET requests
  if (req.body && typeof req.body === 'object') {
    const bodyThreat = checkValueForThreats(req.body, 'body');
    if (bodyThreat) {
      handleSecurityIncident(bodyThreat.type, {
        threatDetails: bodyThreat,
        samplePayload: JSON.stringify(req.body).substring(0, 200)
      }, req);
      return res.status(400).json({
        success: false,
        error: 'Security Alert: Malicious request payload intercepted by PSMS Guardian.',
        incidentId: `sec_${Date.now()}`
      });
    }
  }

  next();
}

export default securityShield;
