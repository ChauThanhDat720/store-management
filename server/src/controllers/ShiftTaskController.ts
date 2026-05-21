import { Response } from 'express';
import ShiftTaskTemplate from '../models/ShiftTaskTemplate';
import ShiftTask from '../models/ShiftTask';
import { AppError } from '../utils/appError';
import { asyncHandler } from '../utils/asyncHandler';
import { getIO } from '../utils/socketManager';
import { AuthRequest } from '../middleware/authMiddleware';

// @desc    Lấy danh sách công việc cho một ngày/ca
// @route   GET /api/tasks?date=YYYY-MM-DD&shift=morning
export const getTasks = asyncHandler(async (req: AuthRequest, res: Response) => {
    const date = req.query.date as string;
    const shift = req.query.shift as string;
    if (!date || !shift) throw new AppError('Thiếu thông tin ngày hoặc ca', 400);

    let tasks: any = await ShiftTask.find({ date, shift: shift as any }).populate('completedBy', 'fullName');

    if (tasks.length === 0) {
        const templates = await ShiftTaskTemplate.find({ shift: shift as any });
        if (templates.length > 0) {
            const newTasks = templates.map(t => ({
                date,
                shift: shift as any,
                taskName: t.taskName,
                isCompleted: false
            }));
            tasks = await ShiftTask.insertMany(newTasks);
        }
    }
    res.json(tasks);
});

// @desc    Cập nhật trạng thái hoàn thành công việc
// @route   PUT /api/tasks/:id
export const updateTaskStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { isCompleted } = req.body;
    const userId = req.user?.id;

    const task = await ShiftTask.findById(id);
    if (!task) throw new AppError('Không tìm thấy đầu việc', 404);

    task.isCompleted = isCompleted;
    task.completedBy = isCompleted ? (userId as any) : undefined;
    task.completedAt = isCompleted ? new Date() : undefined;
    await task.save();

    const io = getIO();
    io.emit('taskUpdated', task);

    res.json(task);
});

// @desc    Lấy danh sách các task mẫu (templates)
// @route   GET /api/tasks/templates
export const getTemplates = asyncHandler(async (req: AuthRequest, res: Response) => {
    const templates = await ShiftTaskTemplate.find().sort({ shift: 1 });
    res.json(templates);
});

// @desc    Thêm một task mẫu mới
// @route   POST /api/tasks/templates
export const addTemplate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { shift, taskName } = req.body;
    if (!shift || !taskName) throw new AppError('Thiếu thông tin', 400);

    const template = await ShiftTaskTemplate.create({ shift, taskName });
    res.status(201).json(template);
});

// @desc    Xóa một task mẫu
// @route   DELETE /api/tasks/templates/:id
export const deleteTemplate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    await ShiftTaskTemplate.findByIdAndDelete(id);
    res.json({ message: 'Đã xóa task mẫu' });
});
