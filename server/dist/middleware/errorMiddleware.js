"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMiddleware = void 0;
/**
 * Global Error Handler Middleware
 */
const errorMiddleware = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    if (process.env.NODE_ENV === 'development') {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
            stack: err.stack,
            error: err,
        });
    }
    else {
        if (err.isOperational) {
            res.status(err.statusCode).json({
                success: false,
                message: err.message,
            });
        }
        else {
            console.error('ERROR 💥', err);
            res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra từ phía hệ thống!',
            });
        }
    }
};
exports.errorMiddleware = errorMiddleware;
