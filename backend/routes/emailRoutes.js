import express from 'express';
import { handleSendEmail, handleVerifyEmailStatus } from '../controllers/emailController.js';
import { validateEmailRequest } from '../middlewares/validationMiddleware.js';

const router = express.Router();

router.post('/send', validateEmailRequest, handleSendEmail);
router.get('/status', handleVerifyEmailStatus);

export default router;
