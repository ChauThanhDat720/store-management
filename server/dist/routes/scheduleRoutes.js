"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const scheduleController_1 = require("../controllers/scheduleController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.use(authMiddleware_1.protect); // Tất cả các route lịch làm đều yêu cầu đăng nhập
router.post('/', scheduleController_1.registerShift);
router.get('/', scheduleController_1.getSchedules);
router.delete('/:id', scheduleController_1.cancelShift);
router.post('/note', scheduleController_1.updateShiftNote);
exports.default = router;
