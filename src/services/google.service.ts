import crypto from 'crypto';
import prisma from '../config/database';
import { supabase } from '../config/supabase';
import { GoogleFetcher } from '../integrations/google/google.fetcher';
import { GoogleTransformer } from '../integrations/google/google.transformer';
import { decrypt } from '../utils/encryption.util';
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
        refreshToken: decrypt(connection.refreshToken),
        customerId: connection.customerId,
      });

      // 3. Fetch data from Google Ads API
      const rawCampaigns = await fetcher.fetchCampaigns(dateRange);

      // 4. Transform data to standard format
      const transformedCampaigns = GoogleTransformer.transformCampaigns(rawCampaigns);

      // 5. Store in database (Upsert)
      let syncedCount = 0;

      for (const campaign of transformedCampaigns) {
        const campaignData = {
          googleCampaignId: campaign.campaignId,
          name: campaign.name,
          status: campaign.status,
          spend: campaign.spend,
          impressions: Math.floor(campaign.impressions),
          clicks: Math.floor(campaign.clicks),
          ctr: campaign.ctr,
          cpc: campaign.cpc,
          cpm: campaign.cpm,
          conversions: campaign.conversions,
          reach: Math.floor(campaign.reach),
          uniqueClicks: Math.floor(campaign.clicks), // Proxy for Google
          socialSpend: 0,
          clientId: connection.appClientId || 'dev_client',
          updatedAt: new Date(),
          connectionId: connectionId
        };

        try {
          await prisma.googleCampaign.upsert({
            where: { googleCampaignId: campaign.campaignId },
            update: campaignData,
            create: campaignData
          });
        } catch (prismaError) {
          // Fallback to Supabase
          const { data: existing } = await supabase
            .from('GoogleCampaign')
            .select('id')
            .eq('googleCampaignId', campaign.campaignId)
            .maybeSingle();
          
          if (existing) {
            await supabase.from('GoogleCampaign').update(campaignData).eq('id', existing.id);
          } else {
            await supabase.from('GoogleCampaign').insert([{ ...campaignData, id: crypto.randomUUID() }]);
          }
        }
        syncedCount++;
      }

      // Update connection status
      const syncedAt = new Date();
      try {
        await prisma.googleConnection.update({
          where: { id: connectionId },
          data: { status: 'active', lastSyncAt: syncedAt, syncError: null },
        });
      } catch (e) {
        await supabase
          .from('GoogleConnection')
          .update({ status: 'active', lastSyncAt: syncedAt, syncError: null })
          .eq('id', connectionId);
      }

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
  /**
   * Test connection with Google Ads credentials
   */
  async testConnection(credentials: {
    developerToken: string;
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    customerId: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const fetcher = new GoogleFetcher({
        developerToken: credentials.developerToken,
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        refreshToken: credentials.refreshToken,
        customerId: credentials.customerId,
      });

      return await fetcher.testConnection();
    } catch (error: any) {
      return { success: false, error: error.message || 'Unknown error testing Google Ads connection' };
    }
  }
}

export default new GoogleService();
