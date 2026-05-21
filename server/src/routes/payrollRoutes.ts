import express from 'express';
import {
    getMonthlyPayroll,
    addPayrollAdjustment,
} from '../controllers/payrollController';
import { protect, adminOnly } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, adminOnly, getMonthlyPayroll);
router.post('/adjustments', protect, adminOnly, addPayrollAdjustment);

export default router;
