import express from 'express';
import {
  getFileUploads,
  getStudentUploadInfo,
  handleStudentUpload,
  sendStudentUploadLinkEmail,
  handleFileUpload,
  serveReportPdf,
  servePptFile,
  verifyFileUpload,
  notifySupervisorAndStudents,
  updatePublicationStatus,
  getTeamFiles,
  uploadMiddleware,
  studentUploadMiddleware,
  clearAllStudentData
} from '../controllers/fileUploadController.js';

const router = express.Router();

// GET all file upload records
router.get('/', getFileUploads);

// Public student link validation and details retrieval
router.get('/upload-info/:batchNumber/:token', getStudentUploadInfo);

// Public student multipart file submission (Report PDF + Presentation PPT)
router.post('/student-upload/:batchNumber/:token', studentUploadMiddleware, handleStudentUpload);

// Coordinator endpoint: Send student upload link email to team students
router.post('/send-upload-link', sendStudentUploadLinkEmail);

// GET team files metadata for a specific batch
router.get('/team/:batchNumber', getTeamFiles);

// Serve stored report PDF (inline viewing in browser)
router.get('/report/:batchNumber', serveReportPdf);

// Serve stored PPT presentation
router.get('/ppt/:batchNumber', servePptFile);

// Coordinator direct upload (PDF/PPT stored directly into MySQL as BLOB)
router.post('/upload', uploadMiddleware.single('file'), handleFileUpload);

// Verification endpoints
router.post('/verify', verifyFileUpload);
router.patch('/verify', verifyFileUpload);
router.patch('/:batchNumber/verify', verifyFileUpload);
router.post('/:batchNumber/verify', verifyFileUpload);

// Email notification endpoints (Verified File Link to Supervisor & Students)
router.post('/notify', notifySupervisorAndStudents);
router.post('/:batchNumber/notify', notifySupervisorAndStudents);

// Publication status update
router.patch('/publication-status', updatePublicationStatus);

// Master administrative clear all student and file data
router.post('/clear-all-data', clearAllStudentData);
router.delete('/clear-all-data', clearAllStudentData);

export default router;
