import express from 'express';
import authRoutes from './authRoutes.js';
import studentRoutes from './studentRoutes.js';
import projectRoutes from './projectRoutes.js';
import mentorRoutes from './mentorRoutes.js';
import reviewRoutes from './reviewRoutes.js';
import reportRoutes from './reportRoutes.js';
import emailRoutes from './emailRoutes.js';
import ragRoutes from './ragRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import oracleRoutes from './oracleRoutes.js';
import securityRoutes from './securityRoutes.js';
import fileUploadRoutes from './fileUploadRoutes.js';
import { getLocalDatabase, saveLocalDatabase } from '../helpers/dbHelper.js';

const router = express.Router();

// Mount individual sub-routers
router.use('/auth', authRoutes);
router.use('/settings', authRoutes); // /api/settings/profile, /api/settings/messages
router.use('/students', studentRoutes);
router.use('/projects', projectRoutes);
router.use('/mentors', mentorRoutes);
router.use('/reviews', reviewRoutes);
router.use('/reports', reportRoutes);
router.use('/email', emailRoutes);
router.use('/rag', ragRoutes);
router.use('/notifications', notificationRoutes);
router.use('/oracle', oracleRoutes);
router.use('/security', securityRoutes);
router.use('/file-uploads', fileUploadRoutes);
router.use('/files', fileUploadRoutes);

// Additional compatibility routes
router.use('/send-email', emailRoutes);
router.use('/messages', emailRoutes);

// Teams routes
router.get('/teams', (req, res) => {
  const db = getLocalDatabase();
  res.json(db.teams || []);
});

router.post('/teams', (req, res) => {
  const db = getLocalDatabase();
  const newTeam = {
    id: 't_' + Date.now(),
    team_batch: parseInt(req.body.team_batch, 10) || 35,
    team_name: req.body.team_name,
    student1_register_number: parseInt(req.body.student1_register_number, 10),
    student2_register_number: parseInt(req.body.student2_register_number, 10),
    project_title: req.body.project_title,
    mentor_roll_number: req.body.mentor_roll_number
  };
  if (!db.teams) db.teams = [];
  db.teams.push(newTeam);
  saveLocalDatabase(db);
  res.json({ success: true, team: newTeam });
});

// Global Reset endpoint to clear all application data
router.post('/reset-all-data', (req, res) => {
  const db = getLocalDatabase();
  db.students = [];
  db.projects = [];
  db.mentors = [];
  db.reviews = [];
  db.files = [];
  db.teams = [];
  db.messageTemplates = [];
  saveLocalDatabase(db);
  res.json({ success: true, message: 'All application records and data cleared successfully.' });
});

export default router;
