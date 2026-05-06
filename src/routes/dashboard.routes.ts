import { Router } from 'express';
import dashboardController from '../controllers/dashboard.controller';
import authMiddleware from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createDashboardSchema,
  updateDashboardSchema,
  getDashboardParamsSchema,
} from '../validators/dashboard.validator';

const router = Router();

// Authentication disabled per user request
// router.use(authMiddleware);


/**
 * @swagger
 * /dashboard:
 *   get:
 *     tags: [Dashboards]
 *     summary: Get all dashboards
 *     description: Returns all dashboards ordered by creation date (newest first).
 *     responses:
 *       200:
 *         description: List of dashboards
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Dashboard'
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.get('/', dashboardController.getAll.bind(dashboardController));

/**
 * @swagger
 * /dashboard/{id}:
 *   get:
 *     tags: [Dashboards]
 *     summary: Get a dashboard by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Dashboard ID (cuid)
 *     responses:
 *       200:
 *         description: Dashboard details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Dashboard'
 *       404:
 *         description: Dashboard not found
 *       401:
 *         description: Not authenticated
 */
router.get(
  '/:id',
  validate(getDashboardParamsSchema),
  dashboardController.getById.bind(dashboardController)
);

/**
 * @swagger
 * /dashboard:
 *   post:
 *     tags: [Dashboards]
 *     summary: Create a new dashboard
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DashboardCreate'
 *     responses:
 *       201:
 *         description: Dashboard created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Dashboard'
 *       400:
 *         description: Invalid data
 *       401:
 *         description: Not authenticated
 */
router.post(
  '/',
  validate(createDashboardSchema),
  dashboardController.create.bind(dashboardController)
);

/**
 * @swagger
 * /dashboard/{id}:
 *   put:
 *     tags: [Dashboards]
 *     summary: Update a dashboard
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Dashboard ID (cuid)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DashboardCreate'
 *     responses:
 *       200:
 *         description: Dashboard updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Dashboard'
 *       400:
 *         description: Update failed
 *       401:
 *         description: Not authenticated
 */
router.put(
  '/:id',
  validate(updateDashboardSchema),
  dashboardController.update.bind(dashboardController)
);

/**
 * @swagger
 * /dashboard/{id}:
 *   delete:
 *     tags: [Dashboards]
 *     summary: Delete a dashboard
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Dashboard ID (cuid)
 *     responses:
 *       204:
 *         description: Dashboard deleted (no content)
 *       400:
 *         description: Delete failed
 *       401:
 *         description: Not authenticated
 */
router.delete(
  '/:id',
  validate(getDashboardParamsSchema),
  dashboardController.delete.bind(dashboardController)
);

export default router;
