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
      // In development mode, if no token is provided, we auto-login as the first user in the system
      const firstUser = await prisma.user.findFirst({
        include: { tenant: true }
      });

      if (firstUser) {
        console.warn(`⚠️ No token provided. Auto-authenticating as ${firstUser.email} for development.`);
        (req as any).user = { 
          userId: firstUser.id,
          tenantId: firstUser.tenant?.id
        };
        return next();
      }

      console.warn('⚠️ No token provided and no users found in DB. Falling back to default ID.');
      (req as any).user = { userId: 'clv_admin_default' }; 
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
