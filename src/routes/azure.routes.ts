import { Router } from 'express';
import azureController from '../controllers/azure.controller';
import authMiddleware from '../middleware/auth.middleware';

const router = Router();

// Authentication disabled per user request
// router.use(authMiddleware);


router.post('/connect', azureController.connect.bind(azureController));
router.get('/connections', azureController.getConnections.bind(azureController));
router.delete('/connections/:id', azureController.deleteConnection.bind(azureController));

export default router;
