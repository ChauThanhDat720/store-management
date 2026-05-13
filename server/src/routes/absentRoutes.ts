import express from 'express';
import { createAbsent, getAbsents, updateAbsentStatus } from '../controllers/AbsentController';
import { protect, adminOnly } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

router.post('/', createAbsent);
router.post('/:scheduleId', createAbsent);
router.get('/', getAbsents);
router.put('/:id/status', adminOnly, updateAbsentStatus);

export default router;
