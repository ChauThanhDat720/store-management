import { Response } from "express";
import Schedule from "../models/Schedule";
import Absent from "../models/Absent";
import { AppError } from "../utils/appError";
import { asyncHandler } from "../utils/asyncHandler";
import { AuthRequest } from "../middleware/authMiddleware";
import { getIO } from "../utils/socketManager";

// @desc Tao don xin phep nghi (Xin huy ca)
// @route POST /api/absent/:scheduleId
export const createAbsent = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { reason, scheduleId: bodyScheduleId } = req.body;
    const scheduleId = req.params.scheduleId || bodyScheduleId;
    const userId = req.user?.id;

    if (!userId) throw new AppError('Khong co thong tin nguoi dung', 401);
    if (!scheduleId) throw new AppError('Thieu thong tin ca lam', 400);
    if (!reason) throw new AppError('Vui long nhap ly do xin nghi', 400);

    const scheduleQuery: any = { _id: scheduleId };
    if (req.user?.role !== 'admin') {
        scheduleQuery.userId = userId;
    }

    const schedule = await Schedule.findOne(scheduleQuery);
    
    if (!schedule) {
        throw new AppError('Không tìm thấy ca làm hoặc bạn không có quyền hủy ca của người khác', 403);
    }

    const isExisting = await Absent.exists({ scheduleId });
    if (isExisting) {
        throw new AppError('Bạn đã gửi đơn xin hủy cho ca làm này rồi, vui lòng chờ duyệt!', 400);
    }

    const newAbsent = await Absent.create({
        userId: schedule.userId,
        date: schedule.date,
        scheduleId: schedule._id,
        reason,
        status: 'pending'
    });

    // Thông báo cho Admin có đơn xin nghỉ mới
    const io = getIO();
    io.to('admin_room').emit('new_absent_request', {
        title: 'Có đơn xin hủy ca mới',
        message: `Có nhân viên vừa tạo đơn xin hủy ca`
    });

    res.status(201).json({ message: 'Tạo đơn xin hủy ca thành công', absent: newAbsent });
});

// @desc Lay danh sach don xin huy ca
// @route GET /api/absent
export const getAbsents = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id: userId, role } = req.user || {};

    let query = {};
    if (role !== 'admin') {
        query = { userId };
    }

    const absents = await Absent.find(query)
        .populate('userId', 'fullName email position')
        .populate('scheduleId', 'shift date')
        .sort({ createdAt: -1 });

    res.json(absents);
});

// @desc Duyet / Tu choi don xin huy ca
// @route PUT /api/absent/:id/status
export const updateAbsentStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
        throw new AppError('Trang thai khong hop le', 400);
    }

    const absent = await Absent.findById(id);
    if (!absent) {
        throw new AppError('Khong tim thay don', 404);
    }

    if (absent.status !== 'pending') {
        throw new AppError(`Don nay da duoc ${absent.status === 'approved' ? 'duyet' : 'tu choi'}`, 400);
    }

    absent.status = status;
    await absent.save();


    if (status === 'approved') {
        await Schedule.findByIdAndDelete(absent.scheduleId);
        getIO().emit('scheduleUpdated'); // Thông báo để load lại lịch
    }

    getIO().emit('absentUpdated', absent);

    res.json({ message: `Da ${status === 'approved' ? 'duyet' : 'tu choi'} don`, absent });
});
