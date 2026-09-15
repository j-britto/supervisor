import express from 'express';
import { getSecurityStatus, runOnDemandScan, triggerTestSecurityAlert } from '../controllers/securityController.js';

const router = express.Router();

router.get('/status', getSecurityStatus);
router.post('/scan', runOnDemandScan);
router.post('/test-alert', triggerTestSecurityAlert);

export default router;
