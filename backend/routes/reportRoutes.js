import express from 'express';
import { getFinalReport } from '../controllers/reportController.js';

const router = express.Router();

router.get('/final/:studentRegisterNumber', getFinalReport);

export default router;
