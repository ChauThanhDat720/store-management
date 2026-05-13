"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminOnly = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const protect = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        res.status(401).json({ message: 'Không có quyền truy cập, vui lòng đăng nhập!' });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
        // Lưu thông tin user vào request để các route sau sử dụng
        req.user = decoded;
        next();
    }
    catch (error) {
        res.status(401).json({ message: 'Token không hợp lệ!' });
    }
};
exports.protect = protect;
// Middleware kiểm tra quyền Admin
const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    }
    else {
        res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này!' });
    }
};
exports.adminOnly = adminOnly;
