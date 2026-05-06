import { Router } from 'express';
import clientController from '../controllers/client.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Note: For prototype phase, we might want to bypass authMiddleware 
// by removing it if the frontend doesn't send JWTs yet.
// For now we add it, but keep it in mind if fetching fails.
router.use(authMiddleware);

router.get('/', clientController.getAll.bind(clientController));
router.get('/:id', clientController.getById.bind(clientController));
router.post('/', clientController.create.bind(clientController));
router.put('/:id', clientController.update.bind(clientController));
router.delete('/:id', clientController.delete.bind(clientController));

export default router;
