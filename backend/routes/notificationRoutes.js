import express from 'express';
import { getNotifications, markAllRead } from '../controllers/notificationController.js';

const router = express.Router();

router.get('/', getNotifications);
router.put('/read-all', markAllRead);

export default router;
