import express from 'express';
import cors from 'cors';
import apiRouter from './routes/index.js';
import { requestLogger } from './middlewares/loggerMiddleware.js';
import { errorHandler } from './middlewares/errorMiddleware.js';
import {
  layer1GeneralLimiter,
  layer1AuthLimiter,
  layer2HelmetArmor,
  layer2ProtocolGuard,
  layer3AntivirusWafScanner,
  layer4AuditAndPrivilegeShield
} from './middlewares/fourLayerFirewall.js';

const app = express();

// Trust proxy for reverse proxy / container ingress (resolves X-Forwarded-For in express-rate-limit)
app.set('trust proxy', 1);

// ============================================================================
// 4-LAYER FIREWALL & ANTIVIRUS INITIALIZATION
// ============================================================================

// Layer 2: HTTP Security Headers (Helmet + Protocol Armor)
app.use(layer2HelmetArmor);
app.use(layer2ProtocolGuard);

// Global Middlewares & Parsers
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Admin-Override']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(requestLogger);

// Layer 1: Network & Rate Limiting (Anti-DDoS / Brute Force Protection)
app.use('/api/auth/login', layer1AuthLimiter);
app.use('/api/auth/signup', layer1AuthLimiter);
app.use('/api/auth/forgot-password', layer1AuthLimiter);
app.use('/api/', layer1GeneralLimiter);

// Layer 3: Application WAF & Deep Antivirus / Malware Payload Scanner
app.use(layer3AntivirusWafScanner);

// Layer 4: Access Control & Privilege Shield
app.use(layer4AuditAndPrivilegeShield);

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'StudyPulse AI PSMS Backend',
    security: '4-Layer Firewall + Antivirus Active (Helmet Enabled)',
    database: 'Oracle SQL (with resilient fallback)',
    timestamp: new Date().toISOString()
  });
});

// Mount Main API Router
app.use('/api', apiRouter);

// Strict 404 handler for ANY unmatched /api routes so they return JSON, never HTML
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// Centralized Error Handling (Layer 4 Emergency Alerting)
app.use(errorHandler);

export default app;
