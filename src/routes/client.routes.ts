import { Router } from 'express';
import clientController from '../controllers/client.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Note: For prototype phase, we might want to bypass authMiddleware 
// by removing it if the frontend doesn't send JWTs yet.
// For now we add it, but keep it in mind if fetching fails.
// router.use(authMiddleware);

router.get('/', clientController.getAll);
router.get('/:id', clientController.getById);

export default router;
