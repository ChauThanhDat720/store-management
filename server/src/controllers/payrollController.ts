import { Response } from 'express';
import User from '../models/User';
import Attendance from '../models/Attendance';
import Schedule from '../models/Schedule';
import Absent from '../models/Absent';
import PayrollAdjustment from '../models/PayrollAdjustment';
import { AuthRequest } from '../middleware/authMiddleware';
const STANDARD_MONTHLY_HOURS = 208;
const STANDARD_WORK_DAYS = 26;

const EVENING_ALLOWANCE_RATE = 0.2;
const WEEKEND_ALLOWANCE_RATE = 0.5;

const LATE_PENALTY = 30000;
const EARLY_PENALTY = 30000;
const isWeekend = (dateStr: string) => {
    const day = new Date(dateStr).getDay();
    return day === 0 || day === 6;
};
export const getMonthlyPayroll = async (req: AuthRequest, res: Response) => {
    try {
        const month = Number(req.query.month);
        const year = Number(req.query.year);
        if (!month || !year) {
            return res.status(400).json({ message: 'Thiếu tháng hoặc năm' })
        }
    } catch (error) {
        return res.status(500).json({ message: 'Lỗi server' });
    }
};

export const addPayrollAdjustment = async (req: AuthRequest, res: Response) => {
    res.status(200).json({ message: 'Not implemented yet' });
};
