import { firewallMetrics } from '../middlewares/fourLayerFirewall.js';
import { ANTIVIRUS_SIGNATURES, scanForMalware } from '../services/antivirusService.js';
import { sendSystemAlert, getAdminEmails } from '../services/alertService.js';
import { getLocalDatabase } from '../helpers/dbHelper.js';

export const getSecurityStatus = (req, res) => {
  const db = getLocalDatabase();
  const securityAlerts = (db && db.securityAlerts) || [];

  res.json({
    success: true,
    firewall: {
      status: 'ACTIVE',
      version: '4.2.0-PSMS-Shield',
      layers: {
        layer1: {
          name: 'Network & Anti-DDoS Rate Limiter',
          status: 'ACTIVE',
          generalLimit: '300 req / min',
          authLimit: '25 attempts / 5 min',
          blockedAttacks: firewallMetrics.layer1BlockedRequests
        },
        layer2: {
          name: 'HTTP Protocol & Helmet Armor',
          status: 'ACTIVE',
          headers: ['CSP-Safe', 'NoSniff', 'XSS-Filter', 'HidePoweredBy', 'StrictReferrer', 'Cross-Origin-Policy'],
          sanitizedRequests: firewallMetrics.layer2SanitizedHeaders
        },
        layer3: {
          name: 'Application WAF & Deep Antivirus Engine',
          status: 'ACTIVE',
          signaturesLoaded: ANTIVIRUS_SIGNATURES.length,
          blockedExploits: firewallMetrics.layer3BlockedAttacks,
          virusesBlocked: firewallMetrics.layer3VirusesBlocked
        },
        layer4: {
          name: 'Access Control & Incident Audit Dispatcher',
          status: 'ACTIVE',
          alertRecipients: getAdminEmails().length,
          accessViolations: firewallMetrics.layer4AccessViolations
        }
      },
      stats: {
        totalScannedRequests: firewallMetrics.totalScannedRequests,
        totalIncidentsRecorded: securityAlerts.length,
        startedAt: firewallMetrics.startedAt
      },
      recentIncidents: securityAlerts.slice(0, 10),
      antivirusSignatures: ANTIVIRUS_SIGNATURES.map(s => ({ id: s.id, name: s.name, severity: s.severity }))
    }
  });
};

export const runOnDemandScan = (req, res) => {
  const { payload, context = 'Manual User Scan' } = req.body;

  if (payload === undefined) {
    return res.status(400).json({ success: false, error: 'Payload data is required for scanning.' });
  }

  const result = scanForMalware(payload, context);

  res.json({
    success: true,
    scanResult: result,
    timestamp: new Date().toISOString()
  });
};

export const triggerTestSecurityAlert = async (req, res) => {
  try {
    const adminEmails = getAdminEmails();
    const alertResult = await sendSystemAlert({
      alertType: 'MANUAL_FIREWALL_TEST',
      severity: 'WARNING',
      title: 'Manual 4-Layer Firewall & Security Test Alert',
      message: 'This is a verified test dispatch confirming that the StudyPulse AI 4-Layer Firewall & Antivirus emergency notification pipeline is fully operational.',
      metadata: {
        triggeredBy: req.ip || 'Admin Dashboard',
        activeLayers: 4,
        antivirusSignatures: ANTIVIRUS_SIGNATURES.length
      }
    });

    res.json({
      success: true,
      message: `Emergency security alert successfully dispatched to ${adminEmails.length} administrators.`,
      recipients: adminEmails,
      result: alertResult
    });
  } catch (err) {
    console.error('Test alert failed:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export default {
  getSecurityStatus,
  runOnDemandScan,
  triggerTestSecurityAlert
};
