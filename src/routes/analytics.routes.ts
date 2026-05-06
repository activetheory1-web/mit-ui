import { Router } from 'express';
import analyticsController from '../controllers/analytics.controller';
import authMiddleware from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

/**
 * @swagger
 * /analytics/meta-dashboard:
 *   get:
 *     tags: [Analytics]
 *     summary: Get Meta Ads dashboard data (exact spec layout)
 *     description: |
 *       Returns all 5 datasets needed for the 7-section Meta dashboard:
 *       KPI summary, daily spend trend, spend by campaign (top 10),
 *       clicks by campaign (top 10), and campaign performance table.
 *
 *       CTR and CPC are always calculated as SUM-based ratios, never AVG.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateRange
 *         schema:
 *           type: integer
 *           enum: [7, 30, 90]
 *           default: 30
 *         description: Number of days to look back
 *     responses:
 *       200:
 *         description: Dashboard data payload
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Query failed
 */
router.get(
  '/meta-dashboard',
  analyticsController.getMetaDashboard.bind(analyticsController)
);

export default router;
