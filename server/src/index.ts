import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import http from 'http';

// Import Routes
import authRoutes from './routes/authRoutes';
import employeeRoutes from './routes/employeeRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import scheduleRoutes from './routes/scheduleRoutes';
import absentRoutes from './routes/absentRoutes';
import taskRoutes from './routes/taskRoutes';
import aiRoutes from './routes/aiRoutes';
import payrollRoutes from './routes/payrollRoutes';
import notificationRoutes from './routes/notificationRoutes';
import { startAutoCheckAbsent } from './controllers/attendanceController';
import { errorMiddleware } from './middleware/errorMiddleware';
import { initSocket } from './utils/socketManager';

// Khởi tạo biến môi trường
dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/store_management';

// Khởi tạo WebSocket
initSocket(server);

// Middleware
app.use(cors());
app.use(express.json());

// Khởi chạy Server
server.listen(PORT, () => {
  console.log(`[server]: Server đang chạy tại http://127.0.0.1:${PORT}`);
});

// Kết nối MongoDB
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Đã kết nối MongoDB thành công');
    // Khởi động các tiến trình chạy ngầm
    startAutoCheckAbsent();
  })
  .catch((err) => {
    console.error('❌ Lỗi kết nối MongoDB:', err.message);
  });

// Sử dụng Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/absent', absentRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/notifications', notificationRoutes);

// Route mặc định
app.get('/', (req, res) => {
  res.send('Server Quản lý nhân viên (MVC) đang chạy!');
});

// Middleware xử lý lỗi tập trung (Phải để sau cùng)
app.use(errorMiddleware);
