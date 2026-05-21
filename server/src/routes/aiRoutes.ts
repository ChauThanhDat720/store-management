import express from 'express';
import { chatWithAI } from '../controllers/aiControllers';
import {
    planAIAction,
    confirmAIAction,
    rejectAIAction,
} from '../controllers/aiActionController';
import { protect, adminOnly } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/chat', protect, adminOnly, chatWithAI);

router.post('/actions/plan', protect, adminOnly, planAIAction);
router.post('/actions/:id/confirm', protect, adminOnly, confirmAIAction);
router.post('/actions/:id/reject', protect, adminOnly, rejectAIAction);

export default router;
