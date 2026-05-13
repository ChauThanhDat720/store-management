import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// 1. Mở rộng kiểu Request của Express để có thêm thuộc tính 'user'
// Đây là kỹ thuật "Declaration Merging" trong TypeScript
export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export const protect = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
     res.status(401).json({ message: 'Không có quyền truy cập, vui lòng đăng nhập!' });
     return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string; role: string };
    
    // Lưu thông tin user vào request để các route sau sử dụng
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token không hợp lệ!' });
  }
};

// Middleware kiểm tra quyền Admin
export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này!' });
  }
};
