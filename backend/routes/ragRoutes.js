import express from 'express';
import { handleRagQuery } from '../controllers/ragController.js';

const router = express.Router();

router.post('/query', handleRagQuery);

export default router;
