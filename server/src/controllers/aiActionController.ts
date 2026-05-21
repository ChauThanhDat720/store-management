import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/appError";
import AIActionLog from "../models/AIActionLog";
import { planAIActionFromMessage } from "../utils/aiActionPlanner";
import { executeAIAction } from '../utils/aiActionExecutor';
export const planAIAction = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { message } = req.body;
    if (!req.user?.id) throw new AppError('Bạn chưa đăng nhập', 401);
    if (!message) throw new AppError('Vui lòng nhập yêu cầu', 400);
    const plan = await planAIActionFromMessage(message);
    //     Format flan:
    // {
    //   "action": "create_schedule | approve_absent_request | reject_absent_request | create_shift_task | send_checkin_reminder | none",
    //   "payload": {},
    //   "summary": "Mô tả ngắn để admin xác nhận",
    //   "requiresConfirmation": true,
    //   "clarificationQuestion": ""
    // }

    if (plan.action === 'none') {
        return res.json({
            status: 'needs_clarification',
            reply: plan.clarificationQuestion,
            plan,
        });
    }
    const log = await AIActionLog.create({
        requestedBy: req.user.id,
        message,
        action: plan.action,
        payload: plan.payload,
        summary: plan.summary || 'Không có mô tả',
        status: 'pending'
    });
    res.status(201).json({
        actionId: log._id,
        summary: log.summary,
        action: log.action,
        payload: log.payload,
        status: log.status
    });
});
export const confirmAIAction = asyncHandler(async (req: AuthRequest, res: Response) => {
    const log = await AIActionLog.findById(req.params.id);
    if (!log) throw new AppError('không tìm thấy action', 404);
    if (log.status !== 'pending') throw new AppError('Action đã được xử lý', 400);
    try {
        const result = await executeAIAction(log.action, log.payload);
        log.status = 'executed';
        log.result = result;
        log.executedAt = new Date();
        await log.save();
        res.json({ message: 'Đã thực hiện thành công ', action: log });
    } catch (error: any) {
        log.status = 'failed';
        log.error = error.message || 'Lỗi không xác định';
        await log.save();
        throw error;
    }
});
export const rejectAIAction = asyncHandler(async (req: AuthRequest, res: Response) => {
    const log = await AIActionLog.findById(req.params.id)
    if (!log) throw new AppError('Không tìm thấy action', 404);
    log.status = 'rejected';
    await log.save();
    res.json({ message: 'Đã hủy acion', action: log })
});