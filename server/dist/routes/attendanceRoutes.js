"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const attendanceController_1 = require("../controllers/attendanceController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.post('/checkin', authMiddleware_1.protect, attendanceController_1.checkIn);
router.post('/checkout', authMiddleware_1.protect, attendanceController_1.checkOut);
router.get('/', authMiddleware_1.protect, attendanceController_1.getAttendance);
router.get('/summary', authMiddleware_1.protect, authMiddleware_1.adminOnly, attendanceController_1.getAttendanceSummary);
router.get('/employee/:id', authMiddleware_1.protect, authMiddleware_1.adminOnly, attendanceController_1.getEmployeeDetail);
exports.default = router;
