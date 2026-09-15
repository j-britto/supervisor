import express from 'express';
import {
  getStatus,
  testConnection,
  getMetrics,
  runCustomQuery
} from '../controllers/oracleController.js';

const router = express.Router();

router.get('/status', getStatus);
router.get('/test', testConnection);
router.get('/metrics', getMetrics);
router.post('/query', runCustomQuery);

export default router;
