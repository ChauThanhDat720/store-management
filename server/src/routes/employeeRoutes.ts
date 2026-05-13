import express from 'express';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee } from '../controllers/employeeController';
import { protect, adminOnly } from '../middleware/authMiddleware';

const router = express.Router();

// Tất cả các route này đều yêu cầu đăng nhập (protect)
router.get('/', protect, getEmployees);
router.post('/', protect, adminOnly, createEmployee);
router.put('/:id', protect, adminOnly, updateEmployee);
router.delete('/:id', protect, adminOnly, deleteEmployee);

export default router;
