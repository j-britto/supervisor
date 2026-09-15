import express from 'express';
import {
  getReviews,
  saveReview,
  updateReview,
  batchSaveReviews
} from '../controllers/reviewController.js';

const router = express.Router();

router.get('/', getReviews);
router.post('/save', saveReview);
router.put('/:id', updateReview);
router.post('/batch-save', batchSaveReviews);

export default router;
