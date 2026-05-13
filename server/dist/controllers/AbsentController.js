"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAbsentStatus = exports.getAbsents = exports.createAbsent = void 0;
const Schedule_1 = __importDefault(require("../models/Schedule"));
const Absent_1 = __importDefault(require("../models/Absent"));
const appError_1 = require("../utils/appError");
const asyncHandler_1 = require("../utils/asyncHandler");
const socketManager_1 = require("../utils/socketManager");
// @desc Tao don xin phep nghi (Xin huy ca)
// @route POST /api/absent/:scheduleId
exports.createAbsent = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { reason, scheduleId: bodyScheduleId } = req.body;
    const scheduleId = req.params.scheduleId || bodyScheduleId;
    const userId = req.user?.id;
    if (!userId) {
        throw new appError_1.AppError('Khong co thong tin nguoi dung', 401);
    }
    if (!scheduleId) {
        throw new appError_1.AppError('Thieu thong tin ca lam', 400);
    }
    if (!reason) {
        throw new appError_1.AppError('Vui long nhap ly do xin nghi', 400);
    }
    const schedule = await Schedule_1.default.findById(scheduleId);
    if (!schedule) {
        throw new appError_1.AppError('Khong tim thay ca lam', 404);
    }
    if (schedule.userId.toString() !== userId && req.user?.role !== 'admin') {
        throw new appError_1.AppError('Ban khong co quyen tao don cho ca lam nay', 403);
    }
    const existingAbsent = await Absent_1.default.findOne({ scheduleId, userId: schedule.userId });
    if (existingAbsent) {
        throw new appError_1.AppError('Ban da co don cho ca lam nay!', 400);
    }
    const newAbsent = new Absent_1.default({
        userId: schedule.userId,
        date: schedule.date,
        scheduleId: schedule._id,
        reason,
        status: 'pending'
    });
    await newAbsent.save();
    // Thông báo cho Admin có đơn xin nghỉ mới
    const io = (0, socketManager_1.getIO)();
    io.to('admin_room').emit('new_absent_request', {
        title: 'Có đơn xin hủy ca mới',
        message: `Có nhân viên vừa tạo đơn xin hủy ca`
    });
    res.status(201).json({ message: 'Tao don thanh cong', absent: newAbsent });
});
// @desc Lay danh sach don xin huy ca
// @route GET /api/absent
exports.getAbsents = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id: userId, role } = req.user || {};
    let query = {};
    if (role !== 'admin') {
        query = { userId };
    }
    const absents = await Absent_1.default.find(query)
        .populate('userId', 'fullName email position')
        .populate('scheduleId', 'shift date')
        .sort({ createdAt: -1 });
    res.json(absents);
});
// @desc Duyet / Tu choi don xin huy ca
// @route PUT /api/absent/:id/status
exports.updateAbsentStatus = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
        throw new appError_1.AppError('Trang thai khong hop le', 400);
    }
    const absent = await Absent_1.default.findById(id);
    if (!absent) {
        throw new appError_1.AppError('Khong tim thay don', 404);
    }
    if (absent.status !== 'pending') {
        throw new appError_1.AppError(`Don nay da duoc ${absent.status === 'approved' ? 'duyet' : 'tu choi'}`, 400);
    }
    absent.status = status;
    await absent.save();
    if (status === 'approved') {
        await Schedule_1.default.findByIdAndDelete(absent.scheduleId);
        (0, socketManager_1.getIO)().emit('scheduleUpdated'); // Thông báo để load lại lịch
    }
    (0, socketManager_1.getIO)().emit('absentUpdated', absent);
    res.json({ message: `Da ${status === 'approved' ? 'duyet' : 'tu choi'} don`, absent });
});
