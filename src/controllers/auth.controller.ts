import { Request, Response, NextFunction } from 'express';
import authService, { RegisterData, LoginData } from '../services/auth.service';
import logger from '../utils/logger';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data: RegisterData = req.body;
      const result = await authService.register(data);
      logger.info(`User registered: ${data.email}`);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data: LoginData = req.body;
      const result = await authService.login(data);
      logger.info(`User logged in: ${data.email}`);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const user = await authService.getUserById(userId);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
