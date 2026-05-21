import User from "../models/User";
import Attendance from "../models/Attendance";
import Schedule from "../models/Schedule";
const getDateString = (date: Date) => {
    return date.toLocaleDateString('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh'
    });
};

export const getEmployeesMissingCheckIn = async (date = getDateString(new Date())) => {
    const [attendanceRecords, schedules] = await Promise.all([
        Attendance.find({ date })
            .select('userId checkIn status')
            .lean(),
        Schedule.find({ date })
            .populate('userId', 'fullName email position department phone status')
            .lean()
    ]);

    const checkedInUserIds = new Set(
        attendanceRecords
            .filter((attendance: any) => attendance.checkIn)
            .map((attendance: any) => attendance.userId?.toString())
            .filter(Boolean)
    );

    const missingCheckIn = schedules.filter((schedule: any) => {
        const userId = schedule.userId?._id?.toString();
        return userId && !checkedInUserIds.has(userId);
    });

    return {
        date,
        totalScheduled: schedules.length,
        totalMissingCheckIn: missingCheckIn.length,
        employees: missingCheckIn.map((schedule: any) => ({
            scheduleId: schedule._id,
            userId: schedule.userId?._id,
            fullName: schedule.userId?.fullName || 'Không xác định',
            email: schedule.userId?.email || null,
            phone: schedule.userId?.phone || null,
            position: schedule.userId?.position || null,
            department: schedule.userId?.department || null,
            employeeStatus: schedule.userId?.status || null,
            shift: schedule.shift,
            date: schedule.date
        }))
    };
};

export const getTodayStoreOverview = async () => {
    const today = getDateString(new Date());
    const [totalEmployees, activeEmployees, attendanceToday, schedulesToday] = await Promise.all([
        User.countDocuments({ role: 'employee' }),
        User.countDocuments({ role: 'employee', status: 'active' }),
        Attendance.find({ date: today })
            .populate('userId', 'fullName email position department')
            .lean(),
        Schedule.find({ date: today })
            .populate('userId', 'fullName position email department')
    ]);
    const checkedInUserIds = new Set(
        attendanceToday
            .map((a: any) => a.userId?._id?.toString())
            .filter(Boolean)
    );

    const scheduledUserIds = new Set(
        schedulesToday
            .map((s: any) => s.userId?._id?.toString())
            .filter(Boolean)
    );

    const scheduledButNotCheckedIn = schedulesToday.filter((s: any) => {
        const id = s.userId?._id?.toString();
        return id && !checkedInUserIds.has(id);
    });

    const checkedInButNoCheckout = attendanceToday.filter((a: any) => {
        return a.checkIn && !a.checkOut;
    });

    return {
        date: today,
        totalEmployees,
        activeEmployees,
        attendance: {
            checkedInToday: attendanceToday.length,
            checkedInButNoCheckout: checkedInButNoCheckout.length,
            checkedInList: attendanceToday.map((a: any) => ({
                fullName: a.userId?.fullName || 'Không xác định',
                email: a.userId?.email || null,
                position: a.userId?.position || null,
                department: a.userId?.department || null,
                checkIn: a.checkIn || null,
                checkOut: a.checkOut || null,
                status: a.status || null
            }))
        },
        schedule: {
            totalScheduledToday: schedulesToday.length,
            scheduledButNotCheckedIn: scheduledButNotCheckedIn.length,
            scheduledButNotCheckedInList: scheduledButNotCheckedIn.map((s: any) => ({
                fullName: s.userId?.fullName || 'Không xác định',
                email: s.userId?.email || null,
                position: s.userId?.position || null,
                department: s.userId?.department || null,
                shift: s.shift || null,
                note: s.note || null
            }))
        }
    };
};
