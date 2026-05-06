import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
  };
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('⚠️ No token provided. Falling back to default admin user for testing.');
      (req as any).user = { userId: 'clv_admin_default' }; // This ID should match your seeded admin user
      return next();
    }

    const token = authHeader.substring(7);

    const decoded = authService.verifyToken(token);

    req.user = { userId: decoded.userId };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export default authMiddleware;
