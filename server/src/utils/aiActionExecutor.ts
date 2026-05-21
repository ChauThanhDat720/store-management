import ShiftTask from '../models/ShiftTask';
import { AppError } from './appError';
import { getIO } from './socketManager';
import Schedule from '../models/Schedule';
import Absent from '../models/Absent';
import Notification from '../models/Notification';

export const executeAIAction = async (action: string, payload: any) => {
    if (action === 'create_shift_task') {
        const { date, shift, taskName } = payload;
        if (!date || !shift || !taskName) {
            throw new AppError('Thieu ngay, ca hoac ten task', 400);
        }

        const existed = await ShiftTask.exists({ date, shift, taskName });
        if (existed) {
            throw new AppError('Task nay da ton tai', 400);
        }

        const task = await ShiftTask.create({
            date,
            shift,
            taskName,
            isCompleted: false,
        });

        getIO().emit('taskUpdated', task);
        return { task };
    }

    if (action === 'create_schedule') {
        const { userId, date, shift } = payload;
        if (!userId || !date || !shift) {
            throw new AppError('Thieu thong tin', 400);
        }

        const existed = await Schedule.exists({ userId, date, shift });
        if (existed) {
            throw new AppError('Nhan vien da dang ky ca lam nay', 400);
        }

        const schedule = await Schedule.create({
            userId,
            date,
            shift,
        });

        getIO().emit('scheduleUpdated');
        return { schedule };
    }

    if (action === 'approve_absent_request' || action === 'reject_absent_request') {
        const { absentId } = payload;
        if (!absentId) {
            throw new AppError('Thieu ID don nghi', 400);
        }

        const absent = await Absent.findById(absentId);
        if (!absent) {
            throw new AppError('Khong tim thay don nghi', 404);
        }

        if (absent.status !== 'pending') {
            throw new AppError(`Don nay da duoc xu ly (trang thai: ${absent.status})`, 400);
        }

        const status = action === 'approve_absent_request' ? 'approved' : 'rejected';
        absent.status = status;
        await absent.save();

        if (status === 'approved') {
            await Schedule.findByIdAndDelete(absent.scheduleId);
            getIO().emit('scheduleUpdated');
        }

        getIO().emit('absentUpdated', absent);
        return { absent, status };
    }

    if (action === 'send_checkin_reminder') {
        const { date } = payload;
        if (!date) {
            throw new AppError('Thieu ngay nhac nho', 400);
        }

        const { getEmployeesMissingCheckIn } = await import('./aiTools');
        const missingData = await getEmployeesMissingCheckIn(date);

        const io = getIO();
        let sentCount = 0;

        for (const emp of missingData.employees) {
            if (emp.userId) {
                const notification = await Notification.create({
                    userId: emp.userId,
                    title: 'Nhắc nhở điểm danh',
                    message: `Bạn có ca làm ${emp.shift === 'morning' ? 'sang' : emp.shift === 'afternoon' ? 'chieu' : 'toi'} ngày hôm nay nhưng chưa điểm danh!`,
                    type: 'ai_reminder',
                    metadata: {
                        date,
                        shift: emp.shift,
                        scheduleId: emp.scheduleId,
                    },
                });

                io.to(`user_${emp.userId.toString()}`).emit('notification', notification);
                sentCount++;
            }
        }

        return { sentCount, totalMissing: missingData.totalMissingCheckIn };
    }

    throw new AppError('Action chưa được hỗ trợ', 400);
};
