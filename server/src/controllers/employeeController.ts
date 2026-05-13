import { Request, Response } from 'express';
import User from '../models/User';
import { AppError } from '../utils/appError';
import { asyncHandler } from '../utils/asyncHandler';
import { getIO } from '../utils/socketManager';
import bcrypt from 'bcryptjs';

// @desc    Lấy danh sách tất cả nhân viên
// @route   GET /api/employees
export const getEmployees = asyncHandler(async (req: Request, res: Response) => {
  const employees = await User.find({ role: 'employee' }).select('-password');
  res.json(employees);
});

// @desc    Thêm nhân viên mới
// @route   POST /api/employees
export const createEmployee = asyncHandler(async (req: Request, res: Response) => {
  const password = req.body.password || '123456';
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newEmployee = new User({
    ...req.body,
    password: hashedPassword,
    role: 'employee'
  });
  const savedEmployee = await newEmployee.save();
  getIO().emit('employeeUpdated');

  const employeeObj = savedEmployee.toObject();
  const { password: _, ...employeeResponse } = employeeObj;

  res.status(201).json(employeeResponse);
});

// @desc    Cập nhật thông tin nhân viên
// @route   PUT /api/employees/:id
export const updateEmployee = asyncHandler(async (req: Request, res: Response) => {
  if (req.body.password) {
    const salt = await bcrypt.genSalt(10);
    req.body.password = await bcrypt.hash(req.body.password, salt);
  }

  const updatedEmployee = await User.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).select('-password');

  if (!updatedEmployee) {
    throw new AppError('Không tìm thấy nhân viên', 404);
  }
  getIO().emit('employeeUpdated');
  res.json(updatedEmployee);
});

// @desc    Xóa nhân viên
// @route   DELETE /api/employees/:id
export const deleteEmployee = asyncHandler(async (req: Request, res: Response) => {
  const employee = await User.findByIdAndDelete(req.params.id);
  if (!employee) {
    throw new AppError('Không tìm thấy nhân viên', 404);
  }
  getIO().emit('employeeUpdated');
  res.json({ message: 'Đã xóa nhân viên thành công' });
});
