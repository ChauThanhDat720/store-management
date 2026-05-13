"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEmployee = exports.updateEmployee = exports.createEmployee = exports.getEmployees = void 0;
const User_1 = __importDefault(require("../models/User"));
const appError_1 = require("../utils/appError");
const asyncHandler_1 = require("../utils/asyncHandler");
const socketManager_1 = require("../utils/socketManager");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// @desc    Lấy danh sách tất cả nhân viên
// @route   GET /api/employees
exports.getEmployees = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const employees = await User_1.default.find({ role: 'employee' }).select('-password');
    res.json(employees);
});
// @desc    Thêm nhân viên mới
// @route   POST /api/employees
exports.createEmployee = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const password = req.body.password || '123456';
    const salt = await bcryptjs_1.default.genSalt(10);
    const hashedPassword = await bcryptjs_1.default.hash(password, salt);
    const newEmployee = new User_1.default({
        ...req.body,
        password: hashedPassword,
        role: 'employee'
    });
    const savedEmployee = await newEmployee.save();
    (0, socketManager_1.getIO)().emit('employeeUpdated');
    const employeeObj = savedEmployee.toObject();
    const { password: _, ...employeeResponse } = employeeObj;
    res.status(201).json(employeeResponse);
});
// @desc    Cập nhật thông tin nhân viên
// @route   PUT /api/employees/:id
exports.updateEmployee = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (req.body.password) {
        const salt = await bcryptjs_1.default.genSalt(10);
        req.body.password = await bcryptjs_1.default.hash(req.body.password, salt);
    }
    const updatedEmployee = await User_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).select('-password');
    if (!updatedEmployee) {
        throw new appError_1.AppError('Không tìm thấy nhân viên', 404);
    }
    (0, socketManager_1.getIO)().emit('employeeUpdated');
    res.json(updatedEmployee);
});
// @desc    Xóa nhân viên
// @route   DELETE /api/employees/:id
exports.deleteEmployee = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const employee = await User_1.default.findByIdAndDelete(req.params.id);
    if (!employee) {
        throw new appError_1.AppError('Không tìm thấy nhân viên', 404);
    }
    (0, socketManager_1.getIO)().emit('employeeUpdated');
    res.json({ message: 'Đã xóa nhân viên thành công' });
});
