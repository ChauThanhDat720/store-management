"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startAutoCheckAbsent = exports.getAttendanceSummary = exports.getEmployeeDetail = exports.getAttendance = exports.checkOut = exports.checkIn = void 0;
const Attendance_1 = __importDefault(require("../models/Attendance"));
const Schedule_1 = __importDefault(require("../models/Schedule"));
const User_1 = __importDefault(require("../models/User"));
const axios_1 = __importDefault(require("axios"));
const node_cron_1 = __importDefault(require("node-cron"));
const socketManager_1 = require("../utils/socketManager");
// Helper to get today's date string (YYYY-MM-DD) in local time
const getTodayDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
const MAX_ACCURACY_ALLOWED = 500;
const validateLocation = (latitude, longitude, accuracy) => {
    if (!latitude || !longitude)
        return 'Vui lòng bật định vị để điểm danh';
    if (accuracy > MAX_ACCURACY_ALLOWED) {
        return `Định vị quá kém (sai số ${Math.round(accuracy)}m). Vui lòng đi ra chỗ thoáng hoặc bật Wi-Fi để tăng độ chính xác.`;
    }
    return null;
};
const getAddressFromCoords = async (latitude, longitude) => {
    try {
        const { data } = await axios_1.default.get(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=vi`, { timeout: 5000 });
        let address = data.locality || data.city || data.principalSubdivision || 'Không xác định';
        if (data.locality && data.city && data.locality !== data.city) {
            address = `${data.locality}, ${data.city}`;
        }
        return address;
    }
    catch (err) {
        console.error('Lỗi lấy địa chỉ:', err instanceof Error ? err.message : err);
        return 'Không xác định';
    }
};
const SHIFT_TIMES = {
    morning: { start: 8, startMin: 0, end: 12, endMin: 0 },
    afternoon: { start: 12, startMin: 0, end: 16, endMin: 30 },
    evening: { start: 16, startMin: 30, end: 20, endMin: 30 }
};
const calculateCheckInStatus = (now, shift) => {
    if (!shift) {
        return (now.getHours() > 8 || (now.getHours() === 8 && now.getMinutes() > 30)) ? 'late' : 'present';
    }
    const config = SHIFT_TIMES[shift];
    const isLate = now.getHours() > config.start || (now.getHours() === config.start && now.getMinutes() > config.startMin);
    return isLate ? 'late' : 'present';
};
const calculateCheckOutStatus = (currentStatus, now, shift) => {
    if (!shift) {
        if (currentStatus === 'present' && (now.getHours() < 17 || (now.getHours() === 17 && now.getMinutes() < 30))) {
            return 'early';
        }
        return currentStatus;
    }
    const config = SHIFT_TIMES[shift];
    const isEarly = now.getHours() < config.end || (now.getHours() === config.end && now.getMinutes() < config.endMin);
    if (currentStatus === 'present' && isEarly)
        return 'early';
    return currentStatus;
};
// @desc    Check‑in (bắt đầu ca)
// @route   POST /api/attendance/checkin
const checkIn = async (req, res) => {
    try {
        const { latitude, longitude, accuracy, scheduleId } = req.body;
        if (!scheduleId)
            return res.status(400).json({ message: 'Vui lòng chọn ca làm việc để điểm danh' });
        const locationError = validateLocation(latitude, longitude, accuracy);
        if (locationError)
            return res.status(400).json({ message: locationError });
        const userId = req.user?.id;
        const date = getTodayDate();
        const user = await User_1.default.findById(userId);
        const schedule = await Schedule_1.default.findById(scheduleId);
        if (!schedule || schedule.userId.toString() !== userId) {
            return res.status(400).json({ message: 'Ca làm việc không hợp lệ hoặc không thuộc về bạn' });
        }
        if (schedule.date !== date) {
            return res.status(400).json({ message: 'Bạn chỉ có thể điểm danh cho ca làm của ngày hôm nay' });
        }
        const existing = await Attendance_1.default.findOne({ schedule: scheduleId });
        if (existing?.checkIn)
            return res.status(400).json({ message: 'Bạn đã điểm danh cho ca làm này rồi' });
        const address = await getAddressFromCoords(latitude, longitude);
        const now = new Date();
        const status = calculateCheckInStatus(now, schedule.shift);
        const attendance = await Attendance_1.default.findOneAndUpdate({ schedule: scheduleId }, {
            userId, date, status,
            checkIn: now,
            location: { type: 'Point', coordinates: [longitude, latitude] },
            address, accuracy
        }, { upsert: true, new: true });
        const io = (0, socketManager_1.getIO)();
        io.emit('attendanceUpdated', attendance);
        io.to('admin_room').emit('new_attendance_alert', {
            title: 'Có nhân viên mới điểm danh',
            message: `Nhân viên ${user?.fullName} vừa check in`,
            time: now
        });
        res.json(attendance);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.checkIn = checkIn;
// @desc    Check‑out (kết thúc ca)
// @route   POST /api/attendance/checkout
const checkOut = async (req, res) => {
    try {
        const { latitude, longitude, accuracy, scheduleId } = req.body;
        if (!scheduleId)
            return res.status(400).json({ message: 'Thiếu mã ca làm việc' });
        const locationError = validateLocation(latitude, longitude, accuracy);
        if (locationError)
            return res.status(400).json({ message: locationError });
        const userId = req.user?.id;
        const existing = await Attendance_1.default.findOne({ schedule: scheduleId, userId });
        if (!existing?.checkIn)
            return res.status(400).json({ message: 'Chưa thực hiện checkin cho ca làm này' });
        if (existing.checkOut)
            return res.status(400).json({ message: 'Đã checkout cho ca làm này rồi' });
        const schedule = await Schedule_1.default.findById(scheduleId);
        const address = await getAddressFromCoords(latitude, longitude);
        const now = new Date();
        const diffMs = now.getTime() - existing.checkIn.getTime();
        const workHours = Math.round((diffMs / 1000 / 60 / 60) * 100) / 100;
        const newStatus = calculateCheckOutStatus(existing.status, now, schedule?.shift);
        const attendance = await Attendance_1.default.findOneAndUpdate({ schedule: scheduleId }, {
            checkOut: now, status: newStatus, workHours,
            location: { type: 'Point', coordinates: [longitude, latitude] },
            address, accuracy
        }, { new: true });
        (0, socketManager_1.getIO)().emit('attendanceUpdated', attendance);
        res.json(attendance);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.checkOut = checkOut;
// @desc    Lấy danh sách chấm công (admin có thể xem tất cả, nhân viên chỉ xem riêng mình)
// @route   GET /api/attendance
const getAttendance = async (req, res) => {
    try {
        const { id: userId, role } = req.user || {};
        if (!userId)
            return res.status(401).json({ message: 'Không có thông tin người dùng' });
        const { date } = req.query;
        const query = role === 'admin' ? {} : { userId };
        if (date)
            query.date = date;
        const populateFields = role === 'admin' ? 'fullName email role' : 'fullName email';
        const records = await Attendance_1.default.find(query)
            .populate('userId', populateFields)
            .sort({ date: -1, createdAt: -1 });
        res.json(records);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAttendance = getAttendance;
// @desc Lấy chi tiết lịch làm, thông tin 1 nhân viên trong 1 tháng
// @route GET /api/attendance/employee/:id
const getEmployeeDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const { month, year } = req.query;
        if (!month || !year) {
            return res.status(400).json({ message: 'Thiếu thông tin tháng/năm' });
        }
        const employee = await User_1.default.findById(id).select('fullName email position department');
        if (!employee) {
            return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
        }
        const datePrefix = `${year}-${String(month).padStart(2, '0')}`;
        const [schedules, attendances] = await Promise.all([
            Schedule_1.default.find({
                userId: id,
                date: { $regex: `^${datePrefix}` }
            }).sort({ date: 1 }),
            Attendance_1.default.find({
                userId: id,
                date: { $regex: `^${datePrefix}` }
            })
        ]);
        const details = schedules.map(schedule => {
            const attendance = attendances.find(a => a.schedule.toString() === schedule._id.toString());
            return {
                schedule,
                attendance: attendance || null
            };
        });
        res.json({
            employee,
            details
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getEmployeeDetail = getEmployeeDetail;
// @desc    Lấy thống kê tổng hợp theo tháng (Admin only)
// @route   GET /api/attendance/summary
const getAttendanceSummary = async (req, res) => {
    try {
        const { month, year } = req.query;
        if (!month || !year)
            return res.status(400).json({ message: 'Thiếu thông tin tháng/năm' });
        const users = await User_1.default.find({ role: 'employee' }).select('fullName position');
        const datePrefix = `${year}-${String(month).padStart(2, '0')}`;
        const [schedules, attendances] = await Promise.all([
            Schedule_1.default.find({ date: { $regex: `^${datePrefix}` } }),
            Attendance_1.default.find({ date: { $regex: `^${datePrefix}` } })
        ]);
        const summary = users.map(user => {
            const userIdStr = user._id.toString();
            const userSchedules = schedules.filter(s => s.userId.toString() === userIdStr);
            const userAttendances = attendances.filter(a => a.userId.toString() === userIdStr);
            return {
                userId: user._id,
                fullName: user.fullName,
                position: user.position,
                totalSchedules: userSchedules.length,
                presentCount: userAttendances.filter(a => a.status === 'present').length,
                lateCount: userAttendances.filter(a => a.status === 'late').length,
                absentCount: userAttendances.filter(a => a.status === 'absent').length,
                earlyCount: userAttendances.filter(a => a.status === 'early').length,
                totalWorkHours: Math.round(userAttendances.reduce((sum, a) => sum + (a.workHours || 0), 0) * 100) / 100
            };
        }).filter(user => user.totalSchedules > 0);
        res.json(summary);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAttendanceSummary = getAttendanceSummary;
const startAutoCheckAbsent = () => {
    // Chạy mỗi 10 phút một lần
    node_cron_1.default.schedule('*/10 * * * *', async () => {
        try {
            const today = getTodayDate();
            const now = new Date();
            const schedules = await Schedule_1.default.find({ date: today });
            for (const schedule of schedules) {
                const shiftConfig = SHIFT_TIMES[schedule.shift];
                if (!shiftConfig)
                    continue;
                const startTime = new Date();
                startTime.setHours(Number(shiftConfig.start));
                startTime.setMinutes(Number(shiftConfig.startMin));
                startTime.setSeconds(0);
                startTime.setMilliseconds(0);
                const deadline = new Date(startTime.getTime() + 30 * 60000);
                if (now > deadline) {
                    const existingAtt = await Attendance_1.default.findOne({ schedule: schedule._id });
                    // Nếu chưa có bản ghi điểm danh HOẶC chưa có checkIn
                    if (!existingAtt || !existingAtt.checkIn) {
                        if (existingAtt?.status !== 'absent') {
                            const newAtt = await Attendance_1.default.findOneAndUpdate({ schedule: schedule._id }, {
                                userId: schedule.userId,
                                date: today,
                                status: 'absent'
                            }, { upsert: true, new: true });
                            (0, socketManager_1.getIO)().emit('attendanceUpdated', newAtt);
                            console.log(`[Cron] Tự động đánh dấu vắng mặt: User ${schedule.userId} - Ca ${schedule.shift}`);
                        }
                    }
                }
            }
        }
        catch (error) {
            console.error('[Cron Error] Lỗi khi kiểm tra vắng mặt tự động:', error);
        }
    });
    console.log(' Đã khởi động tiến trình tự động kiểm tra vắng mặt (mỗi 10 phút)');
};
exports.startAutoCheckAbsent = startAutoCheckAbsent;
