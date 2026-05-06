import { Router } from 'express';
import metaController from '../controllers/meta.controller';
import authMiddleware from '../middleware/auth.middleware';

const router = Router();

// Public routes — no auth needed (proxies Meta API calls to avoid browser CORS)
router.post('/test-connection', metaController.testConnection.bind(metaController));
router.post('/proxy-fetch-campaigns', metaController.proxyFetchCampaigns.bind(metaController));

// All other routes are protected
router.use(authMiddleware);

/**
 * @swagger
 * /meta/connect:
 *   post:
 *     tags: [Meta Ads]
 *     summary: Connect a Meta Ads account
 *     description: Validates and saves Meta API credentials for the current user.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MetaConnectRequest'
 *     responses:
 *       201:
 *         description: Connection established successfully
 *       400:
 *         description: Invalid credentials or connection test failed
 *       401:
 *         description: Not authenticated
 */
router.post('/connect', metaController.connect.bind(metaController));

/**
 * @swagger
 * /meta/connections:
 *   get:
 *     tags: [Meta Ads]
 *     summary: Get all Meta connections
 *     description: Returns all Meta Ads connections for the current user, including campaign counts.
 *     responses:
 *       200:
 *         description: List of connections
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MetaConnection'
 *       401:
 *         description: Not authenticated
 */
router.get('/connections', metaController.getConnections.bind(metaController));

/**
 * @swagger
 * /meta/connections/{id}:
 *   delete:
 *     tags: [Meta Ads]
 *     summary: Delete a Meta connection
 *     description: Removes the connection and all associated synced campaigns.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Connection deleted
 *       404:
 *         description: Connection not found
 *       401:
 *         description: Not authenticated
 */
router.delete('/connections/:id', metaController.deleteConnection.bind(metaController));

/**
 * @swagger
 * /meta/connections/{id}/sync:
 *   post:
 *     tags: [Meta Ads]
 *     summary: Trigger manual sync
 *     description: Fetches the latest campaigns and insights from Meta Ads API for the given connection.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dateRange:
 *                 type: string
 *                 default: last_30d
 *                 description: Date preset (last_30d, last_7d, this_month, etc.)
 *     responses:
 *       200:
 *         description: Sync completed successfully
 *       404:
 *         description: Connection not found
 *       500:
 *         description: Sync failed
 */
router.post('/connections/:id/sync', metaController.sync.bind(metaController));

/**
 * @swagger
 * /meta/connections/{id}/status:
 *   get:
 *     tags: [Meta Ads]
 *     summary: Get connection sync status
 *     description: Returns the current sync status and last sync time for a connection.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Connection status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MetaConnection'
 *       404:
 *         description: Connection not found
 */
router.get('/connections/:id/status', metaController.getStatus.bind(metaController));

/**
 * @swagger
 * /meta/connections/{connectionId}/campaigns:
 *   get:
 *     tags: [Meta Ads]
 *     summary: Get synced Meta campaigns
 *     description: Returns all campaigns synced from Meta for the given connection.
 *     parameters:
 *       - in: path
 *         name: connectionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of synced campaigns
 *       404:
 *         description: Connection not found
 */
router.get(
  '/connections/:connectionId/campaigns',
  metaController.getCampaigns.bind(metaController)
);

export default router;
