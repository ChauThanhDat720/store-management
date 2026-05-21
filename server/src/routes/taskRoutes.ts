import express from 'express';
import { getTasks, updateTaskStatus, getTemplates, addTemplate, deleteTemplate } from '../controllers/ShiftTaskController';
import { protect, adminOnly } from '../middleware/authMiddleware';

const router = express.Router();

// Routes cho nhân viên và admin
router.get('/', protect, getTasks);
router.put('/:id', protect, updateTaskStatus);

// Routes cho admin quản lý mẫu
router.get('/templates', protect, adminOnly, getTemplates);
router.post('/templates', protect, adminOnly, addTemplate);
router.delete('/templates/:id', protect, adminOnly, deleteTemplate);

export default router;
