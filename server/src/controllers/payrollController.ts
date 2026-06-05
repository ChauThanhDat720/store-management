import { Response } from 'express';
import User from '../models/User';
import Attendance from '../models/Attendance';
import Schedule from '../models/Schedule';
import Absent from '../models/Absent';
import PayrollAdjustment from '../models/PayrollAdjustment';
import PayrollFinalization from '../models/PayrollFinalization';
import Notification from '../models/Notification';
import { AuthRequest } from '../middleware/authMiddleware';
import { AppError } from '../utils/appError';
import { asyncHandler } from '../utils/asyncHandler';
import { getIO } from '../utils/socketManager';

const parseMonthYear = (monthValue: unknown, yearValue: unknown) => {
  const month = Number(monthValue);
  const year = Number(yearValue);

  if (!month || !year || month < 1 || month > 12) {
    throw new AppError('Thieu hoac sai thong tin thang/nam', 400);
  }

  return { month, year };
};

const getDatePrefix = (month: number, year: number) => {
  return `${year}-${String(month).padStart(2, '0')}`;
};

const isAllowance = (type: string) => type === 'allowance' || type === 'bonus';
const isDeduction = (type: string) => type === 'deduction' || type === 'penalty';

const buildPayrollSummary = async (user: any, month: number, year: number) => {
  const userId = user._id.toString();
  const datePrefix = getDatePrefix(month, year);
  const dateQuery = { $regex: `^${datePrefix}` };

  const [schedules, attendances, approvedAbsents, adjustments, finalization] = await Promise.all([
    Schedule.find({ userId, date: dateQuery }).sort({ date: 1, shift: 1 }).lean(),
    Attendance.find({ userId, date: dateQuery }).sort({ date: 1 }).lean(),
    Absent.find({ userId, date: dateQuery, status: 'approved' }).lean(),
    PayrollAdjustment.find({ userId, month, year }).sort({ createdAt: -1 }).lean(),
    PayrollFinalization.findOne({ userId, month, year }).lean(),
  ]);

  const totalHours = Math.round(
    attendances.reduce((sum, attendance: any) => sum + (attendance.workHours || 0), 0) * 100
  ) / 100;
  const hourlyRate = Number(user.salary || 0);
  const estimatedSalary = Math.round(totalHours * hourlyRate);
  const totalAllowance = adjustments
    .filter((adjustment: any) => isAllowance(adjustment.type))
    .reduce((sum: number, adjustment: any) => sum + Number(adjustment.amount || 0), 0);
  const totalDeduction = adjustments
    .filter((adjustment: any) => isDeduction(adjustment.type))
    .reduce((sum: number, adjustment: any) => sum + Number(adjustment.amount || 0), 0);

  const attendanceBySchedule = new Map(
    attendances.map((attendance: any) => [attendance.schedule?.toString(), attendance])
  );

  return {
    user: {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      position: user.position,
      department: user.department,
    },
    month,
    year,
    totalRegisteredShifts: schedules.length,
    completedShifts: attendances.filter((attendance: any) => attendance.workHours && attendance.checkOut).length,
    absentShifts: attendances.filter((attendance: any) => attendance.status === 'absent').length,
    approvedAbsentRequests: approvedAbsents.length,
    lateCount: attendances.filter((attendance: any) => attendance.status === 'late').length,
    earlyCount: attendances.filter((attendance: any) => attendance.status === 'early').length,
    totalHours,
    hourlyRate,
    estimatedSalary,
    totalAllowance,
    totalDeduction,
    officialSalary: finalization?.finalSalary || null,
    payrollStatus: finalization?.status || 'draft',
    finalizedAt: finalization?.finalizedAt || null,
    finalizationNote: finalization?.note || '',
    adjustments,
    details: schedules.map((schedule: any) => {
      const attendance = attendanceBySchedule.get(schedule._id.toString()) || null;
      return {
        schedule,
        attendance,
      };
    }),
  };
};

export const getMyPayroll = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.id) {
    throw new AppError('Ban chua dang nhap', 401);
  }

  const { month, year } = parseMonthYear(req.query.month, req.query.year);
  const user = await User.findById(req.user.id).lean();

  if (!user) {
    throw new AppError('Khong tim thay nhan vien', 404);
  }

  const summary = await buildPayrollSummary(user, month, year);
  res.json(summary);
});

export const getMonthlyPayroll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { month, year } = parseMonthYear(req.query.month, req.query.year);

  const employees = await User.find({ role: 'employee' })
    .select('fullName email position department salary')
    .sort({ fullName: 1 })
    .lean();

  const payroll = await Promise.all(
    employees.map((employee) => buildPayrollSummary(employee, month, year))
  );

  res.json({
    month,
    year,
    payroll,
    totals: {
      totalHours: Math.round(payroll.reduce((sum, item) => sum + item.totalHours, 0) * 100) / 100,
      estimatedSalary: payroll.reduce((sum, item) => sum + item.estimatedSalary, 0),
      officialSalary: payroll.reduce((sum, item) => sum + (item.officialSalary || 0), 0),
    },
  });
});

export const getEmployeePayroll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { month, year } = parseMonthYear(req.query.month, req.query.year);
  const user = await User.findById(req.params.userId).lean();

  if (!user) {
    throw new AppError('Khong tim thay nhan vien', 404);
  }

  const summary = await buildPayrollSummary(user, month, year);
  res.json(summary);
});

export const addPayrollAdjustment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userId, month, year, type, amount, reason, note } = req.body;

  if (!userId || !month || !year || !type || !amount || !reason) {
    throw new AppError('Thieu thong tin dieu chinh luong', 400);
  }

  if (!['allowance', 'deduction', 'bonus', 'penalty'].includes(type)) {
    throw new AppError('Loai dieu chinh khong hop le', 400);
  }

  const adjustment = await PayrollAdjustment.create({
    userId,
    month: Number(month),
    year: Number(year),
    type,
    amount: Number(amount),
    reason,
    note,
    createdBy: req.user?.id,
  });

  res.status(201).json(adjustment);
});

export const deletePayrollAdjustment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const adjustment = await PayrollAdjustment.findByIdAndDelete(req.params.id);

  if (!adjustment) {
    throw new AppError('Khong tim thay dieu chinh luong', 404);
  }

  res.json({ message: 'Da xoa dieu chinh luong' });
});

export const finalizePayroll = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.id) {
    throw new AppError('Ban chua dang nhap', 401);
  }

  const { month, year, note } = req.body;
  const parsed = parseMonthYear(month, year);
  const targetUserId = String(req.params.userId);
  const user = await User.findById(targetUserId).lean();

  if (!user) {
    throw new AppError('Khong tim thay nhan vien', 404);
  }

  const summary = await buildPayrollSummary(user, parsed.month, parsed.year);
  const finalSalary = summary.estimatedSalary + summary.totalAllowance - summary.totalDeduction;

  const finalization = await PayrollFinalization.findOneAndUpdate(
    { userId: targetUserId, month: parsed.month, year: parsed.year },
    {
      userId: targetUserId,
      month: parsed.month,
      year: parsed.year,
      totalHours: summary.totalHours,
      hourlyRate: summary.hourlyRate,
      estimatedSalary: summary.estimatedSalary,
      totalAllowance: summary.totalAllowance,
      totalDeduction: summary.totalDeduction,
      finalSalary,
      status: 'finalized',
      note,
      finalizedBy: req.user.id,
      finalizedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const notification = await Notification.create({
    userId: targetUserId,
    title: `Luong thang ${parsed.month}/${parsed.year} da duoc chot`,
    message: `Luong chinh thuc cua ban la ${finalSalary.toLocaleString('vi-VN')} VND.`,
    type: 'success',
    metadata: {
      month: parsed.month,
      year: parsed.year,
      finalSalary,
    },
  });

  getIO().to(`user_${targetUserId}`).emit('notification', notification);

  res.json({ finalization });
});
