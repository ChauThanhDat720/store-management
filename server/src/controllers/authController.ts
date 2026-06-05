import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { AppError } from '../utils/appError';
import { asyncHandler } from '../utils/asyncHandler';
import crypto from 'crypto';
import { sendEmail } from '../utils/sendEmail';

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
//desc Quên mật khẩu
//@route POST/api/auth/forgot-password
// @desc Quên mật khẩu
// @route POST /api/auth/forgot-password
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findOne({
    email: req.body.email
  });
  if (!user) {
    throw new AppError('Không tìm thấy người dùng với email này', 404);
  }
  const resetToken = crypto.randomBytes(32).toString('hex');

  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;


  const message = `
    <h2>Yêu cầu đặt lại mật khẩu</h2>
    <p>Bạn nhận được email này vì đã yêu cầu đặt lại mật khẩu. Vui lòng click vào link bên dưới để tạo mật khẩu mới:</p>
    <a href="${resetUrl}" target="_blank">Đặt lại mật khẩu tại đây</a>
    <p><em>Link này chỉ có hiệu lực trong vòng 10 phút. Nếu bạn không yêu cầu đặt lại mật khẩu, xin hãy bỏ qua email này.</em></p>
  `;
  // 5. Gửi email và xử lý lỗi
  try {
    await sendEmail({
      email: user.email,
      subject: 'Yêu cầu đặt lại mật khẩu - Store Management',
      message
    });
    res.status(200).json({
      success: true,
      message: 'Email khôi phục mật khẩu đã được gửi!'
    });
  } catch (err) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined,
      await user.save({ validateBeforeSave: false });
    throw new AppError('Lỗi hệ thống: Không thể gửi email lúc này. Vui lòng thử lại sau!', 500);
  }
});
// @desc Đặt lại mật khẩu mới 
// @route POST /api/auth/reset - password/:token
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const token = req.params.token as string;
  const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpires: { $gt: new Date() }
  });
  if (!user) {
    throw new AppError('Đường dẫn đặt lại mật khẩu không hợp lệ hoặc đã hết hạn!', 400)
  }
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(req.body.password, salt);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
  res.status(200).json({
    success: true,
    message: 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại với mật khẩu mới.'
  })
})
// @desc    Lấy danh sách tất cả người dùng (Admin only)
// @route   GET /api/auth/users
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const users = await User.find({ role: 'employee' }).select('-password');
  res.json(users);
});
