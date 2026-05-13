import express from 'express';
import { checkIn, checkOut, getAttendance, getAttendanceSummary, getEmployeeDetail } from '../controllers/attendanceController';
import { protect, adminOnly } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/checkin', protect, checkIn);
router.post('/checkout', protect, checkOut);
router.get('/', protect, getAttendance);
router.get('/summary', protect, adminOnly, getAttendanceSummary);
router.get('/employee/:id', protect, adminOnly, getEmployeeDetail);

export default router;
