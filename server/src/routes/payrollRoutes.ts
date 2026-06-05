import express from 'express';
import {
    getMonthlyPayroll,
    getMyPayroll,
    getEmployeePayroll,
    addPayrollAdjustment,
    deletePayrollAdjustment,
    finalizePayroll,
} from '../controllers/payrollController';
import { protect, adminOnly } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/me', protect, getMyPayroll);
router.get('/', protect, adminOnly, getMonthlyPayroll);
router.get('/:userId', protect, adminOnly, getEmployeePayroll);
router.post('/adjustments', protect, adminOnly, addPayrollAdjustment);
router.delete('/adjustments/:id', protect, adminOnly, deletePayrollAdjustment);
router.post('/:userId/finalize', protect, adminOnly, finalizePayroll);

export default router;
