"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const http_1 = __importDefault(require("http"));
// Import Routes
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const employeeRoutes_1 = __importDefault(require("./routes/employeeRoutes"));
const attendanceRoutes_1 = __importDefault(require("./routes/attendanceRoutes"));
const scheduleRoutes_1 = __importDefault(require("./routes/scheduleRoutes"));
const absentRoutes_1 = __importDefault(require("./routes/absentRoutes"));
const attendanceController_1 = require("./controllers/attendanceController");
const errorMiddleware_1 = require("./middleware/errorMiddleware");
const socketManager_1 = require("./utils/socketManager");
// Khởi tạo biến môi trường
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/store_management';
// Khởi tạo WebSocket
(0, socketManager_1.initSocket)(server);
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Khởi chạy Server
server.listen(PORT, () => {
    console.log(`[server]: Server đang chạy tại http://127.0.0.1:${PORT}`);
});
// Kết nối MongoDB
mongoose_1.default
    .connect(MONGODB_URI)
    .then(() => {
    console.log('✅ Đã kết nối MongoDB thành công');
    // Khởi động các tiến trình chạy ngầm
    (0, attendanceController_1.startAutoCheckAbsent)();
})
    .catch((err) => {
    console.error('❌ Lỗi kết nối MongoDB:', err.message);
});
// Sử dụng Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/employees', employeeRoutes_1.default);
app.use('/api/attendance', attendanceRoutes_1.default);
app.use('/api/schedules', scheduleRoutes_1.default);
app.use('/api/absent', absentRoutes_1.default);
// Route mặc định
app.get('/', (req, res) => {
    res.send('Server Quản lý nhân viên (MVC) đang chạy!');
});
// Middleware xử lý lỗi tập trung (Phải để sau cùng)
app.use(errorMiddleware_1.errorMiddleware);
