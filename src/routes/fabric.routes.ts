import { Router } from 'express';
import fabricController from '../controllers/fabric.controller';
import authMiddleware from '../middleware/auth.middleware';

const router = Router();

// Authentication disabled per user request
// router.use(authMiddleware);


router.post('/connect', fabricController.connect.bind(fabricController));
router.get('/config', fabricController.getConfig.bind(fabricController));
router.get('/connections', fabricController.getConnections.bind(fabricController));
router.delete('/connections/:id', fabricController.deleteConnection.bind(fabricController));

export default router;
