import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { AppError } from '../utils/appError';
import { asyncHandler } from '../utils/asyncHandler';


// @desc    Đăng ký người dùng mới
// @route   POST /api/auth/register
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { fullName, email, password, role, position, department } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('Email này đã được sử dụng!', 400);
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = new User({
    fullName,
    email,
    password: hashedPassword,
    role,
    position: position || 'Nhân viên',
    department: department || 'Cửa hàng'
  });

  await newUser.save();
  res.status(201).json({ message: 'Đăng ký tài khoản thành công!' });
});

// @desc    Đăng nhập người dùng
// @route   POST /api/auth/login
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).lean();
  if (!user) {
    throw new AppError('Tài khoản không tồn tại!', 400);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new AppError('Mật khẩu không chính xác!', 400);
  }

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '1d' }
  );

  res.json({
    token,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role
    }
  });
});

// @desc    Lấy danh sách tất cả người dùng (Admin only)
// @route   GET /api/auth/users
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const users = await User.find({ role: 'employee' }).select('-password');
  res.json(users);
});
