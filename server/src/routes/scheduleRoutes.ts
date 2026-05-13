import express from 'express';
import { registerShift, getSchedules, cancelShift, updateShiftNote } from '../controllers/scheduleController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect); // Tất cả các route lịch làm đều yêu cầu đăng nhập

router.post('/', registerShift);
router.get('/', getSchedules);
router.delete('/:id', cancelShift);
router.post('/note', updateShiftNote);

export default router;
