"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const employeeController_1 = require("../controllers/employeeController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Tất cả các route này đều yêu cầu đăng nhập (protect)
router.get('/', authMiddleware_1.protect, employeeController_1.getEmployees);
router.post('/', authMiddleware_1.protect, authMiddleware_1.adminOnly, employeeController_1.createEmployee);
router.put('/:id', authMiddleware_1.protect, authMiddleware_1.adminOnly, employeeController_1.updateEmployee);
router.delete('/:id', authMiddleware_1.protect, authMiddleware_1.adminOnly, employeeController_1.deleteEmployee);
exports.default = router;
