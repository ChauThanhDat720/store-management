"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const AbsentController_1 = require("../controllers/AbsentController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.use(authMiddleware_1.protect);
router.post('/', AbsentController_1.createAbsent);
router.post('/:scheduleId', AbsentController_1.createAbsent);
router.get('/', AbsentController_1.getAbsents);
router.put('/:id/status', authMiddleware_1.adminOnly, AbsentController_1.updateAbsentStatus);
exports.default = router;
