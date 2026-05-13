import express from 'express';
import { register, login, getUsers } from '../controllers/authController';
import { protect, adminOnly } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/users', protect, adminOnly, getUsers);

export default router;
