import express from 'express';
import { register, login, getUsers, forgotPassword, resetPassword } from '../controllers/authController';
import { protect, adminOnly } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.get('/users', protect, adminOnly, getUsers);
router.post('/reset-password/:token', resetPassword);
export default router;
