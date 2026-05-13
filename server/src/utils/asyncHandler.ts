import { Request, Response, NextFunction } from 'express';

/**
 * Wrapper for async express routes to catch errors and pass them to the error handler
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
    /// .catch(next) => .catch(err => next(err))
  };
};
