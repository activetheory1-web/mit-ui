import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service';
import prisma from '../config/database';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    tenantId?: string;
  };
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // In development mode, bypass DB entirely and use hardcoded IDs
      console.warn('⚠️ No token provided. Using hardcoded dev_user and dev_tenant for development.');
      (req as any).user = { 
        userId: 'dev_user',
        tenantId: 'dev_tenant'
      };
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
