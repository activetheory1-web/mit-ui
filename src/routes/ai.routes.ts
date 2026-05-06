import { Router } from 'express';
import aiController from '../controllers/ai.controller';
import authMiddleware from '../middleware/auth.middleware';
import { aiLimiter } from '../middleware/rateLimit.middleware';
import { validate } from '../middleware/validate.middleware';
import { generateDashboardSchema } from '../validators/ai.validator';

const router = Router();

// Authentication disabled per user request
// router.use(authMiddleware);


/**
 * @swagger
 * /ai/generate-dashboard:
 *   post:
 *     tags: [AI Engine]
 *     summary: Generate dashboard widgets from natural language prompt
 *     description: |
 *       Sends the user's prompt to Grok (xAI) API which returns widget specifications,
 *       then queries campaign data from PostgreSQL to populate the widgets with real data.
 *
 *       **How it works:**
 *       1. Check in-memory cache for identical recent queries
 *       2. Call Grok API (`grok-2-latest`) with system prompt
 *       3. Parse the JSON widget spec returned by Grok
 *       4. Query campaign data from database matching widget filters
 *       5. Return populated widgets ready for frontend rendering
 *
 *       **Rate limit:** 10 requests per minute per user.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AIGenerateRequest'
 *           examples:
 *             topCampaigns:
 *               summary: Top campaigns by spend
 *               value:
 *                 prompt: "Show me top 5 campaigns by spend"
 *             worstCPC:
 *               summary: Worst CPC campaigns
 *               value:
 *                 prompt: "Which campaigns have the worst CPC?"
 *             channelComparison:
 *               summary: Compare channels
 *               value:
 *                 prompt: "Compare performance across Meta and Google"
 *             clientScoped:
 *               summary: Client-scoped query
 *               value:
 *                 prompt: "Show all active campaigns"
 *                 clientId: "clx1abc2d0001"
 *     responses:
 *       200:
 *         description: Generated dashboard widgets with real data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AIGenerateResponse'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: AI rate limit exceeded (10 req/min per user)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RateLimitError'
 *       500:
 *         description: AI engine error (Grok returned invalid JSON, database error, etc.)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/generate-dashboard',
  aiLimiter,
  validate(generateDashboardSchema),
  aiController.generateDashboard.bind(aiController)
);

export default router;
