import { Router } from 'express';
import oauthController from '../controllers/oauth.controller';
import authMiddleware from '../middleware/auth.middleware';

const router = Router();

// Routes for generating OAuth URLs (protected, requires user to be logged in to pass userId in state)
router.get('/meta/auth-url', authMiddleware, oauthController.getMetaAuthUrl.bind(oauthController));
router.get(
  '/google/auth-url',
  authMiddleware,
  oauthController.getGoogleAuthUrl.bind(oauthController)
);

// Routes for OAuth callbacks (also protected, the frontend will call this after receiving the code)
router.post('/meta/callback', authMiddleware, oauthController.metaCallback.bind(oauthController));
router.post(
  '/google/callback',
  authMiddleware,
  oauthController.googleCallback.bind(oauthController)
);

export default router;
