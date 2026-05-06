import { Request, Response } from 'express';
import axios from 'axios';
import { google } from 'googleapis';
import prisma from '../config/database';
import pipelineSyncService from '../services/pipeline.sync.service';

export class OAuthController {
  // --- Meta OAuth ---
  async getMetaAuthUrl(req: Request, res: Response) {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const clientId = process.env.META_APP_ID;
    const redirectUri = `${process.env.FRONTEND_URL}/integrations/callback/meta`;
    // We pass userId in state to correlate the callback
    const state = userId;
    const scope = 'ads_management,ads_read';

    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`;

    res.json({ url: authUrl });
  }

  async metaCallback(req: Request, res: Response) {
    try {
      const { code, state } = req.body;
      const userId = state;

      if (!code || !userId) {
        return res.status(400).json({ error: 'Missing code or state' });
      }

      const clientId = process.env.META_APP_ID;
      const clientSecret = process.env.META_APP_SECRET;
      const redirectUri = `${process.env.FRONTEND_URL}/integrations/callback/meta`;

      // 1. Exchange code for short-lived token
      const tokenResponse = await axios.get(`https://graph.facebook.com/v19.0/oauth/access_token`, {
        params: {
          client_id: clientId,
          redirect_uri: redirectUri,
          client_secret: clientSecret,
          code,
        },
      });
      const shortLivedToken = tokenResponse.data.access_token;

      // 2. Exchange short-lived token for long-lived token
      const longLivedResponse = await axios.get(
        `https://graph.facebook.com/v19.0/oauth/access_token`,
        {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: clientId,
            client_secret: clientSecret,
            fb_exchange_token: shortLivedToken,
          },
        }
      );
      const longLivedToken = longLivedResponse.data.access_token;

      // 3. Fetch Ad Account ID (For simplicity, we fetch the first available ad account)
      // In a real production app, you might want the user to select which ad account to use
      // if they have multiple.
      const accountsResponse = await axios.get(`https://graph.facebook.com/v19.0/me/adaccounts`, {
        params: {
          access_token: longLivedToken,
          fields: 'account_id,name',
        },
      });

      const adAccounts = accountsResponse.data.data;
      if (!adAccounts || adAccounts.length === 0) {
        return res.status(400).json({ error: 'No Meta ad accounts found for this user.' });
      }

      const defaultAccount = adAccounts[0];
      const adAccountId = `act_${defaultAccount.account_id}`;
      const accountName = defaultAccount.name || 'Meta Ads Account';

      // 4. Save to Database
      const existingConnection = await prisma.metaConnection.findFirst({
        where: { userId, adAccountId },
      });

      if (existingConnection) {
        await prisma.metaConnection.update({
          where: { id: existingConnection.id },
          data: {
            appId: clientId as string,
            appSecret: clientSecret as string,
            accessToken: longLivedToken,
            accountName,
            status: 'active',
            updatedAt: new Date(),
          },
        });
      } else {
        await prisma.metaConnection.create({
          data: {
            userId,
            appId: clientId as string,
            appSecret: clientSecret as string,
            accessToken: longLivedToken,
            adAccountId,
            accountName,
            status: 'active',
          },
        });
      }

      // 5. Trigger Data Factory Pipeline to sync historical data
      await pipelineSyncService.triggerFabricPipeline(
        process.env.FABRIC_WORKSPACE_ID || '',
        process.env.FABRIC_META_PIPELINE_ID || ''
      );

      res.json({ success: true, message: 'Meta Ads connected successfully', accountName });
    } catch (error: any) {
      console.error('Meta OAuth Callback Error:', error?.response?.data || error);
      res.status(500).json({ error: 'Failed to authenticate with Meta' });
    }
  }

  // --- Google OAuth ---
  private getGoogleOAuth2Client() {
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.FRONTEND_URL}/integrations/callback/google`
    );
  }

  async getGoogleAuthUrl(req: Request, res: Response) {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const oauth2Client = this.getGoogleOAuth2Client();

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Request a refresh token
      prompt: 'consent', // Force consent to ensure we get a refresh token
      scope: ['https://www.googleapis.com/auth/adwords'],
      state: userId,
    });

    res.json({ url: authUrl });
  }

  async googleCallback(req: Request, res: Response) {
    try {
      const { code, state } = req.body;
      const userId = state;

      if (!code || !userId) {
        return res.status(400).json({ error: 'Missing code or state' });
      }

      const oauth2Client = this.getGoogleOAuth2Client();

      // 1. Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      const refreshToken = tokens.refresh_token;

      if (!refreshToken) {
        // If we didn't get a refresh token, it means the user has already authorized the app
        // We'd need to force them to re-authorize or use the existing token.
        // For simplicity, we fail here if no refresh token is provided on first connect.
        return res
          .status(400)
          .json({
            error: 'No refresh token received from Google. Please disconnect and reconnect.',
          });
      }

      const clientId = process.env.GOOGLE_CLIENT_ID as string;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET as string;
      const developerToken = process.env.GOOGLE_DEVELOPER_TOKEN as string;

      // Note: fetching the customerId via Google Ads API is complex in the Node SDK
      // without setting up the full Google Ads API client.
      // For this MVP implementation, we'll store a placeholder and require the user
      // to supply their customer ID later, or we can use the 'customers:listAccessibleCustomers' endpoint.
      // But we will use a placeholder customer ID for now.
      const customerId = 'PLACEHOLDER_CUSTOMER_ID';
      const accountName = 'Google Ads Account';

      // 3. Save to Database
      const existingConnection = await prisma.googleConnection.findFirst({
        where: { userId }, // We don't have customerId yet, so we just check for any existing user connection
      });

      if (existingConnection) {
        await prisma.googleConnection.update({
          where: { id: existingConnection.id },
          data: {
            clientId,
            clientSecret,
            refreshToken,
            developerToken,
            status: 'active',
            updatedAt: new Date(),
          },
        });
      } else {
        await prisma.googleConnection.create({
          data: {
            userId,
            clientId,
            clientSecret,
            refreshToken,
            developerToken,
            customerId,
            accountName,
            status: 'active',
          },
        });
      }

      // 4. Trigger Data Factory Pipeline to sync historical data
      await pipelineSyncService.triggerFabricPipeline(
        process.env.FABRIC_WORKSPACE_ID || '',
        process.env.FABRIC_GOOGLE_PIPELINE_ID || ''
      );

      res.json({ success: true, message: 'Google Ads connected successfully' });
    } catch (error: any) {
      console.error('Google OAuth Callback Error:', error?.response?.data || error);
      res.status(500).json({ error: 'Failed to authenticate with Google' });
    }
  }
}

export default new OAuthController();
