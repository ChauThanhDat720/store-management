"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateShiftNote = exports.cancelShift = exports.getSchedules = exports.registerShift = void 0;
const Schedule_1 = __importDefault(require("../models/Schedule"));
const ShiftNote_1 = __importDefault(require("../models/ShiftNote"));
const appError_1 = require("../utils/appError");
const asyncHandler_1 = require("../utils/asyncHandler");
const socketManager_1 = require("../utils/socketManager");
// @desc    Đăng ký ca làm việc
// @route   POST /api/schedules
exports.registerShift = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId)
        throw new appError_1.AppError('Không có thông tin người dùng', 401);
    const { date, shift } = req.body;
    if (!date || !shift)
        throw new appError_1.AppError('Thiếu thông tin ngày hoặc ca làm', 400);
    if (req.user?.role === 'employee') {
        // const now = new Date();
        // const targetDateObj = new Date(date);
        // ... logic kiểm tra ngày đăng ký ...
    }
    const count = await Schedule_1.default.countDocuments({ date, shift });
    if (count >= 4) {
        throw new appError_1.AppError('Ca làm việc này đã đủ 4 nhân viên đăng ký', 400);
    }
    try {
        const newSchedule = new Schedule_1.default({ userId, date, shift });
        await newSchedule.save();
        (0, socketManager_1.getIO)().emit('scheduleUpdated');
        res.status(201).json({ message: 'Đăng ký ca làm thành công', schedule: newSchedule });
    }
    catch (error) {
        if (error.code === 11000) {
            throw new appError_1.AppError('Bạn đã đăng ký ca làm việc này rồi', 400);
        }
        throw error;
    }
});
// @desc    Lấy danh sách lịch làm việc
// @route   GET /api/schedules
exports.getSchedules = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { date, month, year } = req.query;
    let query = {};
    if (date) {
        query.date = date;
    }
    else if (month && year) {
        const prefix = `${year}-${String(month).padStart(2, '0')}`;
        query.date = { $regex: new RegExp(`^${prefix}`) };
    }
    const schedules = await Schedule_1.default.find(query)
        .populate('userId', 'fullName email position department')
        .sort({ date: 1, shift: 1 });
    const notes = await ShiftNote_1.default.find(query);
    res.json({ schedules, notes });
});
// @desc    Hủy đăng ký ca làm
// @route   DELETE /api/schedules/:id
exports.cancelShift = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    const { id } = req.params;
    const schedule = await Schedule_1.default.findById(id);
    if (!schedule)
        throw new appError_1.AppError('Không tìm thấy lịch làm việc', 404);
    if (schedule.userId.toString() !== userId && req.user?.role !== 'admin') {
        throw new appError_1.AppError('Bạn không có quyền hủy lịch này', 403);
    }
    await Schedule_1.default.findByIdAndDelete(id);
    (0, socketManager_1.getIO)().emit('scheduleUpdated');
    res.json({ message: 'Đã hủy đăng ký ca làm thành công' });
});
// @desc    Cập nhật ghi chú ca làm (Admin only)
// @route   POST /api/schedules/note
exports.updateShiftNote = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (req.user?.role !== 'admin') {
        throw new appError_1.AppError('Chỉ Admin mới có quyền tạo ghi chú', 403);
    }
    const { date, shift, note } = req.body;
    if (!date || !shift)
        throw new appError_1.AppError('Thiếu thông tin ngày hoặc ca', 400);
    const updatedNote = await ShiftNote_1.default.findOneAndUpdate({ date, shift }, { note: note || '' }, { upsert: true, new: true, setDefaultsOnInsert: true });
    (0, socketManager_1.getIO)().emit('scheduleUpdated');
    res.json(updatedNote);
});
