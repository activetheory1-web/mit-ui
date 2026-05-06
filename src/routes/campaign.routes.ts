import { Router } from 'express';
import campaignController from '../controllers/campaign.controller';
import authMiddleware from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createCampaignSchema,
  updateCampaignSchema,
  getCampaignParamsSchema,
} from '../validators/campaign.validator';

const router = Router();

// All routes are protected
router.use(authMiddleware);

/**
 * @swagger
 * /campaigns:
 *   get:
 *     tags: [Campaigns]
 *     summary: Get all campaigns
 *     description: Returns all campaigns with their associated client data, ordered by creation date (newest first).
 *     responses:
 *       200:
 *         description: List of campaigns
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Campaign'
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.get('/', campaignController.getAll.bind(campaignController));

/**
 * @swagger
 * /campaigns/{id}:
 *   get:
 *     tags: [Campaigns]
 *     summary: Get a campaign by ID
 *     description: Returns a single campaign with its associated client data.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID (cuid)
 *     responses:
 *       200:
 *         description: Campaign details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Campaign'
 *       404:
 *         description: Campaign not found
 *       401:
 *         description: Not authenticated
 *         security:
 *           - bearerAuth: []
 */
router.get(
  '/:id',
  validate(getCampaignParamsSchema),
  campaignController.getById.bind(campaignController)
);

/**
 * @swagger
 * /api/campaigns:
 *   post:
 *     tags: [Campaigns]
 *     summary: Create a new campaign
 *     description: Creates a new advertising campaign linked to a client.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CampaignCreate'
 *     responses:
 *       201:
 *         description: Campaign created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Campaign'
 *       400:
 *         description: Invalid data
 *       401:
 *         description: Not authenticated
 *         security:
 *           - bearerAuth: []
 */
router.post(
  '/',
  validate(createCampaignSchema),
  campaignController.create.bind(campaignController)
);

/**
 * @swagger
 * /api/campaigns/{id}:
 *   put:
 *     tags: [Campaigns]
 *     summary: Update a campaign
 *     description: Updates an existing campaign. Only provided fields are updated.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID (cuid)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CampaignCreate'
 *     responses:
 *       200:
 *         description: Campaign updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Campaign'
 *       400:
 *         description: Update failed
 *       401:
 *         description: Not authenticated
 *         security:
 *           - bearerAuth: []
 */
router.put(
  '/:id',
  validate(updateCampaignSchema),
  campaignController.update.bind(campaignController)
);

/**
 * @swagger
 * /api/campaigns/{id}:
 *   delete:
 *     tags: [Campaigns]
 *     summary: Delete a campaign
 *     description: Permanently deletes a campaign.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID (cuid)
 *     responses:
 *       204:
 *         description: Campaign deleted (no content)
 *       400:
 *         description: Delete failed
 *       401:
 *         description: Not authenticated
 *         security:
 *           - bearerAuth: []
 */
router.delete(
  '/:id',
  validate(getCampaignParamsSchema),
  campaignController.delete.bind(campaignController)
);

export default router;
