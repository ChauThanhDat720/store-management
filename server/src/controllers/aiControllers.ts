import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/appError';

import { databaseSchema } from '../utils/aiDatabaseSchema';
import { runSafeAIQuery } from '../utils/runSafeAIQuery';
import { businessRules } from '../utils/aiBusinessRules';
import { getTodayStoreOverview, getEmployeesMissingCheckIn } from '../utils/aiTools';
import {
    formatChatHistory,
    saveChatMessage
} from '../utils/aiMemory';

const getGeminiModel = () => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new AppError('Chưa cấu hình GEMINI_API_KEY trên server', 500);
    }

    return new GoogleGenerativeAI(apiKey).getGenerativeModel({
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite'
    });
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const generateWithRetry = async (model: any, prompt: string, retries = 3) => {
    let lastError: any;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await model.generateContent(prompt);
        } catch (error: any) {
            lastError = error;

            const message = error?.message || '';
            const canRetry =
                error?.status === 503 ||
                error?.statusCode === 503 ||
                message.includes('503') ||
                message.includes('Service Unavailable') ||
                message.includes('high demand');

            if (!canRetry || attempt === retries) {
                throw error;
            }

            await sleep(1000 * attempt);
        }
    }

    throw lastError;
};

const extractJson = (text: string) => {
    const cleaned = text
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

    return JSON.parse(cleaned);
};

const getTodayString = () => {
    return new Date().toLocaleDateString('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh'
    });
};

export const chatWithAI = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { message } = req.body;

    if (!message) {
        throw new AppError('Vui lòng nhập câu hỏi', 400);
    }

    if (!req.user) {
        throw new AppError('Bạn chưa đăng nhập', 401);
    }

    const userId = req.user.id

    if (!userId) {
        throw new AppError('Không xác định được người dùng', 401);
    }

    const model = getGeminiModel();
    const today = getTodayString();

    // Lưu câu hỏi của admin vào memory
    saveChatMessage(userId, 'user', message);

    // Lấy lịch sử hội thoại gần nhất
    const chatHistory = formatChatHistory(userId);

    // Lấy overview tổng quan hôm nay
    const todayOverview = await getTodayStoreOverview();
    // Lấy những nhân viên không checkin hôm nay
    const todaMissingCheckIn = await getEmployeesMissingCheckIn();

    // Bước 1: AI tạo query plan
    const plannerPrompt = `
Bạn là AI phân tích câu hỏi thành kế hoạch truy vấn database MongoDB.

Ngày hiện tại: ${today}

Schema database:
${databaseSchema}

Quy tắc nghiệp vụ:
${businessRules}

Tổng quan cửa hàng hôm nay:
${JSON.stringify(todayOverview, null, 2)}
Nhân viên không checkin hôm nay : 
${JSON.stringify(todaMissingCheckIn, null, 2)}
Lịch sử hội thoại gần nhất:
${chatHistory}

Câu hỏi mới nhất của Admin:
"${message}"

Nhiệm vụ:
Hãy tạo query plan để backend lấy dữ liệu phù hợp.

Chỉ trả về JSON hợp lệ, không giải thích, không markdown.

Format:
{
  "collection": "users | attendances | schedules",
  "filter": {},
  "sort": {},
  "limit": 10,
  "populate": []
}

Quy tắc tạo query:
- Chỉ dùng field có trong schema.
- Nếu hỏi nhân viên thì dùng collection users.
- Nếu hỏi chấm công, đi làm, vắng mặt thì dùng attendances.
- Nếu hỏi lịch, ca làm thì dùng schedules.
- Nếu collection là attendances hoặc schedules và cần tên nhân viên thì populate ["userId"].
- Nếu câu hỏi đã đủ dữ liệu trong "Tổng quan cửa hàng hôm nay", vẫn tạo query gần nhất có liên quan.
- Không dùng toán tử nguy hiểm.
- Limit tối đa 50.
`;

    const planResult = await generateWithRetry(model, plannerPrompt);
    const planText = planResult.response.text();

    let plan;

    try {
        plan = extractJson(planText);
    } catch (error) {
        throw new AppError('AI không tạo được query plan hợp lệ', 500);
    }

    // Bước 2: Backend kiểm tra và query DB
    const queryData = await runSafeAIQuery(plan);

    // Bước 3: AI trả lời cuối cùng
    const answerPrompt = `
Bạn là trợ lý ảo thông minh của hệ thống quản lý cửa hàng Store Management.

Ngày hiện tại: ${today}

Quy tắc nghiệp vụ:
${businessRules}

Lịch sử hội thoại gần nhất:
${chatHistory}

Tổng quan cửa hàng hôm nay:
${JSON.stringify(todayOverview, null, 2)}
Nhân viên không checkin hôm nay:
${JSON.stringify(todaMissingCheckIn, null, 2)}
Câu hỏi của Admin:
"${message}"

Query plan đã dùng:
${JSON.stringify(plan, null, 2)}

Dữ liệu lấy thêm từ database:
${JSON.stringify(queryData, null, 2)}

Yêu cầu trả lời:
- Trả lời bằng tiếng Việt.
- Ngắn gọn, rõ ràng, chuyên nghiệp.
- Ưu tiên dữ liệu thật từ database.
- Có thể kết hợp dữ liệu từ tổng quan hôm nay và dữ liệu query thêm.
- Nếu dữ liệu rỗng, nói rõ là chưa tìm thấy dữ liệu phù hợp.
- Không bịa số liệu.
- Nếu câu hỏi mơ hồ, hãy hỏi lại admin.
- Nếu thấy vấn đề quản lý, hãy đưa ra gợi ý ngắn gọn.
`;

    const finalResult = await generateWithRetry(model, answerPrompt);
    const reply = finalResult.response.text();

    // Lưu câu trả lời AI vào memory
    saveChatMessage(userId, 'assistant', reply);

    res.json({
        reply,
        plan,
        dataCount: Array.isArray(queryData) ? queryData.length : 0,
        overview: todayOverview
    });
});
