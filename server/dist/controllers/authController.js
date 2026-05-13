"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsers = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const appError_1 = require("../utils/appError");
const asyncHandler_1 = require("../utils/asyncHandler");
// @desc    Đăng ký người dùng mới
// @route   POST /api/auth/register
exports.register = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { fullName, email, password, role, position, department } = req.body;
    const existingUser = await User_1.default.findOne({ email });
    if (existingUser) {
        throw new appError_1.AppError('Email này đã được sử dụng!', 400);
    }
    const salt = await bcryptjs_1.default.genSalt(10);
    const hashedPassword = await bcryptjs_1.default.hash(password, salt);
    const newUser = new User_1.default({
        fullName,
        email,
        password: hashedPassword,
        role,
        position: position || 'Nhân viên',
        department: department || 'Cửa hàng'
    });
    await newUser.save();
    res.status(201).json({ message: 'Đăng ký tài khoản thành công!' });
});
// @desc    Đăng nhập người dùng
// @route   POST /api/auth/login
exports.login = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    const user = await User_1.default.findOne({ email }).lean();
    if (!user) {
        throw new appError_1.AppError('Tài khoản không tồn tại!', 400);
    }
    const isMatch = await bcryptjs_1.default.compare(password, user.password);
    if (!isMatch) {
        throw new appError_1.AppError('Mật khẩu không chính xác!', 400);
    }
    const token = jsonwebtoken_1.default.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
    res.json({
        token,
        user: {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            role: user.role
        }
    });
});
// @desc    Lấy danh sách tất cả người dùng (Admin only)
// @route   GET /api/auth/users
exports.getUsers = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const users = await User_1.default.find({ role: 'employee' }).select('-password');
    res.json(users);
});
