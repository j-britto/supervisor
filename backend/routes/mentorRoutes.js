import express from 'express';
import {
  getMentors,
  createMentor,
  updateMentor,
  deleteMentor,
  removeAllMentors
} from '../controllers/mentorController.js';

const router = express.Router();

router.get('/', getMentors);
router.post('/', createMentor);
router.delete('/all', removeAllMentors);
router.put('/:id', updateMentor);
router.delete('/:id', deleteMentor);

export default router;
