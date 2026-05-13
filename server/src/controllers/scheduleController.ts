import { Request, Response } from 'express';
import Schedule from '../models/Schedule';
import ShiftNote from '../models/ShiftNote';
import { AuthRequest } from '../middleware/authMiddleware';
import { AppError } from '../utils/appError';
import { asyncHandler } from '../utils/asyncHandler';
import { getIO } from '../utils/socketManager';

// @desc    Đăng ký ca làm việc
// @route   POST /api/schedules
export const registerShift = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new AppError('Không có thông tin người dùng', 401);

  const { date, shift } = req.body;
  if (!date || !shift) throw new AppError('Thiếu thông tin ngày hoặc ca làm', 400);


  if (req.user?.role === 'employee') {
    // const now = new Date();
    // const targetDateObj = new Date(date);
    // ... logic kiểm tra ngày đăng ký ...
  }
  
  const count = await Schedule.countDocuments({ date, shift });
  if (count >= 4) {
    throw new AppError('Ca làm việc này đã đủ 4 nhân viên đăng ký', 400);
  }

  try {
    const newSchedule = new Schedule({ userId, date, shift });
    await newSchedule.save();
    getIO().emit('scheduleUpdated');
    res.status(201).json({ message: 'Đăng ký ca làm thành công', schedule: newSchedule });
  } catch (error: any) {
    if (error.code === 11000) {
      throw new AppError('Bạn đã đăng ký ca làm việc này rồi', 400);
    }
    throw error;
  }
});

// @desc    Lấy danh sách lịch làm việc
// @route   GET /api/schedules
export const getSchedules = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { date, month, year } = req.query;
  let query: any = {};

  if (date) {
    query.date = date;
  } else if (month && year) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    query.date = { $regex: new RegExp(`^${prefix}`) };
  }

  const schedules = await Schedule.find(query)
    .populate('userId', 'fullName email position department')
    .sort({ date: 1, shift: 1 });

  const notes = await ShiftNote.find(query);

  res.json({ schedules, notes });
});

// @desc    Hủy đăng ký ca làm
// @route   DELETE /api/schedules/:id
export const cancelShift = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { id } = req.params;

  const schedule = await Schedule.findById(id);
  if (!schedule) throw new AppError('Không tìm thấy lịch làm việc', 404);

  if (schedule.userId.toString() !== userId && req.user?.role !== 'admin') {
    throw new AppError('Bạn không có quyền hủy lịch này', 403);
  }

  await Schedule.findByIdAndDelete(id);
  getIO().emit('scheduleUpdated');
  res.json({ message: 'Đã hủy đăng ký ca làm thành công' });
});

// @desc    Cập nhật ghi chú ca làm (Admin only)
// @route   POST /api/schedules/note
export const updateShiftNote = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    throw new AppError('Chỉ Admin mới có quyền tạo ghi chú', 403);
  }

  const { date, shift, note } = req.body;
  if (!date || !shift) throw new AppError('Thiếu thông tin ngày hoặc ca', 400);

  const updatedNote = await ShiftNote.findOneAndUpdate(
    { date, shift },
    { note: note || '' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  getIO().emit('scheduleUpdated');
  res.json(updatedNote);
});
