import { Router } from 'express';
import googleController from '../controllers/google.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Authentication disabled per user request
// router.use(authMiddleware);
router.post('/connect', googleController.connect);


/**
 * @swagger
 * /api/google/connections:
 *   get:
 *     summary: Get all Google Ads connections for the user
 *     tags: [Google Ads]
 *     security:
 *       - bearerAuth: []
 */
router.get('/connections', googleController.getConnections);

/**
 * @swagger
 * /api/google/connections/{id}:
 *   delete:
 *     summary: Delete a Google Ads connection
 *     tags: [Google Ads]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/connections/:id', googleController.deleteConnection);

/**
 * @swagger
 * /api/google/connections/{id}/sync:
 *   post:
 *     summary: Sync campaigns from Google Ads API
 *     tags: [Google Ads]
 *     security:
 *       - bearerAuth: []
 */
router.post('/connections/:id/sync', googleController.sync);

export default router;
