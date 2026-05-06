import prisma from '../config/database';
import { GoogleFetcher } from '../integrations/google/google.fetcher';
import { GoogleTransformer } from '../integrations/google/google.transformer';
import unifiedSyncService from './unified.sync.service';

export class GoogleService {
  /**
   * Sync campaigns from Google Ads API to database
   */
  async syncCampaigns(
    connectionId: string,
    dateRange: string = 'LAST_30_DAYS'
  ): Promise<{ success: boolean; count: number; error?: string }> {
    try {
      // 1. Get connection details
      const connection = await prisma.googleConnection.findUnique({
        where: { id: connectionId },
      });

      if (!connection) {
        throw new Error('Google connection not found');
      }

      if (
        !process.env.GOOGLE_CLIENT_ID ||
        !process.env.GOOGLE_CLIENT_SECRET ||
        !process.env.GOOGLE_DEVELOPER_TOKEN
      ) {
        throw new Error('Google Ads API credentials not configured');
      }

      // 2. Initialize fetcher
      const fetcher = new GoogleFetcher({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        developerToken: process.env.GOOGLE_DEVELOPER_TOKEN,
        refreshToken: connection.refreshToken,
        customerId: connection.customerId,
      });

      // 3. Fetch data from Google Ads API
      const rawCampaigns = await fetcher.fetchCampaigns(dateRange);

      // 4. Transform data to standard format
      const transformedCampaigns = GoogleTransformer.transformCampaigns(rawCampaigns);

      // 5. Store in database (Upsert)
      let syncedCount = 0;

      for (const campaign of transformedCampaigns) {
        await prisma.googleCampaign.upsert({
          where: {
            googleCampaignId: campaign.campaignId,
          },
          update: {
            name: campaign.name,
            status: campaign.status,
            spend: campaign.spend,
            impressions: BigInt(Math.floor(campaign.impressions)),
            clicks: BigInt(Math.floor(campaign.clicks)),
            ctr: campaign.ctr,
            cpc: campaign.cpc,
            cpm: campaign.cpm,
            conversions: campaign.conversions,
            reach: BigInt(Math.floor(campaign.reach)),
            uniqueClicks: BigInt(Math.floor(campaign.clicks)), // Proxy for Google
            socialSpend: 0, // Google is Search/Display
            clientId: connection.appClientId,
            updatedAt: new Date(),
          },
          create: {
            connectionId,
            googleCampaignId: campaign.campaignId,
            clientId: connection.appClientId,
            name: campaign.name,
            status: campaign.status,
            spend: campaign.spend,
            impressions: BigInt(Math.floor(campaign.impressions)),
            clicks: BigInt(Math.floor(campaign.clicks)),
            ctr: campaign.ctr,
            cpc: campaign.cpc,
            cpm: campaign.cpm,
            conversions: campaign.conversions,
            reach: BigInt(Math.floor(campaign.reach)),
            uniqueClicks: BigInt(Math.floor(campaign.clicks)),
            socialSpend: 0,
          },
        });
        syncedCount++;
      }

      // Update connection status
      await prisma.googleConnection.update({
        where: { id: connectionId },
        data: {
          status: 'active',
          lastSyncAt: new Date(),
          syncError: null,
        },
      });

      // 6. Run Unified Sync
      await unifiedSyncService.upsertUnifiedCampaigns(connection.userId);

      return { success: true, count: syncedCount };
    } catch (error: any) {
      console.error('Google Ads sync failed:', error);

      // Update connection status with error
      try {
        await prisma.googleConnection.update({
          where: { id: connectionId },
          data: {
            status: 'error',
            syncError: error.message || 'Unknown error during sync',
          },
        });
      } catch (dbError) {
        console.error('Failed to update Google connection status:', dbError);
      }

      return { success: false, count: 0, error: error.message || 'Sync failed' };
    }
  }
}

export default new GoogleService();
