import { GoogleGenerativeAI } from '@google/generative-ai';
import { AppError } from './appError';
import User from '../models/User';
import Absent from '../models/Absent';
import { getEmployeesMissingCheckIn } from './aiTools';

const getTodayString = () => {
    return new Date().toLocaleDateString('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
    });
};

const extractJson = (text: string) => {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');

    if (start === -1 || end === -1) {
        throw new AppError('AI không trả về JSON hợp lệ', 500);
    }

    return JSON.parse(cleaned.slice(start, end + 1));
};

const getGeminiModel = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new AppError('Chưa cấu hình GEMINI_API_KEY', 500);

    return new GoogleGenerativeAI(apiKey).getGenerativeModel({
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite',
    });
};

export const planAIActionFromMessage = async (message: string) => {
    const today = getTodayString();

    const [employees, pendingAbsents, missingCheckIn] = await Promise.all([
        User.find({ role: 'employee', status: 'active' })
            .select('fullName email position department')
            .lean(),
        Absent.find({ status: 'pending' })
            .populate('userId', 'fullName email position')
            .populate('scheduleId', 'date shift')
            .lean(),
        getEmployeesMissingCheckIn(today),
    ]);

    const prompt = `
Bạn là AI planner cho hệ thống Store Management.

Ngày hiện tại: ${today}

Admin yêu cầu:
"${message}"

Danh sách nhân viên:
${JSON.stringify(employees, null, 2)}

Đơn nghỉ đang chờ duyệt:
${JSON.stringify(pendingAbsents, null, 2)}

Nhân viên chưa check-in hôm nay:
${JSON.stringify(missingCheckIn, null, 2)}

Hãy chuyển yêu cầu admin thành JSON action.

Action được phép:
- create_schedule
- approve_absent_request
- reject_absent_request
- create_shift_task
- send_checkin_reminder
- none

Quy ước ca:
- ca sáng = morning
- ca chiều = afternoon
- ca tối = evening

Chỉ trả về JSON, không markdown.

Format:
{
  "action": "create_schedule | approve_absent_request | reject_absent_request | create_shift_task | send_checkin_reminder | none",
  "payload": {},
  "summary": "Mô tả ngắn để admin xác nhận",
  "requiresConfirmation": true,
  "clarificationQuestion": ""
}

Payload create_schedule:
{
  "userId": "id nhân viên",
  "date": "YYYY-MM-DD",
  "shift": "morning | afternoon | evening"
}

Payload create_shift_task:
{
  "date": "YYYY-MM-DD",
  "shift": "morning | afternoon | evening",
  "taskName": "tên công việc"
}

Payload approve_absent_request / reject_absent_request:
{
  "absentId": "id đơn nghỉ"
}

Payload send_checkin_reminder:
{
  "date": "YYYY-MM-DD"
}

Nếu thiếu dữ liệu quan trọng, action = "none" và điền clarificationQuestion.
Không bịa id. Chỉ dùng id có trong dữ liệu được cung cấp.
`;

    const model = getGeminiModel();
    const result = await model.generateContent(prompt);
    return extractJson(result.response.text());
};
