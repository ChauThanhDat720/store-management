"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = void 0;
/**
 * Wrapper for async express routes to catch errors and pass them to the error handler
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
        /// .catch(next) => .catch(err => next(err))
    };
};
exports.asyncHandler = asyncHandler;
