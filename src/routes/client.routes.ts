import { Router } from 'express';
import clientController from '../controllers/client.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Authentication disabled per user request
// router.use(authMiddleware);


router.get('/', clientController.getAll.bind(clientController));
router.get('/:id', clientController.getById.bind(clientController));
router.post('/', clientController.create.bind(clientController));
router.put('/:id', clientController.update.bind(clientController));
router.delete('/:id', clientController.delete.bind(clientController));

export default router;
