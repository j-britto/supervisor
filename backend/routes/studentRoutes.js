import express from 'express';
import {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent
} from '../controllers/studentController.js';
import { clearAllStudentData } from '../controllers/fileUploadController.js';

const router = express.Router();

router.get('/', getStudents);
router.post('/', createStudent);
router.post('/clear-all-data', clearAllStudentData);
router.delete('/clear-all-data', clearAllStudentData);
router.put('/:id', updateStudent);
router.delete('/:id', deleteStudent);

export default router;
