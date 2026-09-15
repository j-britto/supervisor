import express from 'express';
import {
  getAdmins,
  signup,
  sendOtp,
  verifyOtp,
  forgotPasswordSendOtp,
  forgotPasswordVerifyOtp,
  login,
  getProfile,
  updateProfile
} from '../controllers/authController.js';
import { getLocalDatabase, saveLocalDatabase } from '../helpers/dbHelper.js';

const router = express.Router();

router.get('/admins', getAdmins);
router.post('/signup', signup);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/forgot-password/send-otp', forgotPasswordSendOtp);
router.post('/forgot-password/verify-otp', forgotPasswordVerifyOtp);
router.post('/login', login);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/profile', updateProfile);

// Message Templates routes (under settings)
router.get('/messages', (req, res) => {
  const db = getLocalDatabase();
  res.json(db.messageTemplates || []);
});

router.post('/messages', (req, res) => {
  const { type, title, template } = req.body;
  const db = getLocalDatabase();
  const newTemplate = {
    id: 'msg-' + Date.now(),
    type: type || 'student',
    title: title || 'Custom Review Message',
    template,
    active: true
  };
  if (!db.messageTemplates) db.messageTemplates = [];
  db.messageTemplates.push(newTemplate);
  saveLocalDatabase(db);
  res.json({ success: true, template: newTemplate });
});

router.put('/messages/:id', (req, res) => {
  const { id } = req.params;
  const db = getLocalDatabase();
  const idx = db.messageTemplates ? db.messageTemplates.findIndex(t => t.id === id) : -1;
  if (idx !== -1) {
    db.messageTemplates[idx] = { ...db.messageTemplates[idx], ...req.body };
    saveLocalDatabase(db);
    return res.json({ success: true, template: db.messageTemplates[idx] });
  }
  res.status(404).json({ error: 'Message template not found' });
});

router.delete('/messages/:id', (req, res) => {
  const { id } = req.params;
  const db = getLocalDatabase();
  if (db.messageTemplates) {
    db.messageTemplates = db.messageTemplates.filter(t => t.id !== id);
    saveLocalDatabase(db);
  }
  res.json({ success: true, message: 'Message template deleted' });
});

export default router;
