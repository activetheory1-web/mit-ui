import prisma from '../config/database';
import { supabase } from '../config/supabase';
import crypto from 'crypto';
import { MetaFetcher } from '../integrations/meta/meta.fetcher';
import { MetaTransformer } from '../integrations/meta/meta.transformer';
import unifiedSyncService from './unified.sync.service';

export interface MetaConnectionData {
  appId: string;
  appSecret: string;
  accessToken: string;
  adAccountId: string;
}

export class MetaService {
  /**
   * Create a new Meta connection
   */
  async createConnection(userId: string, credentials: MetaConnectionData): Promise<any> {
    const { appId, appSecret, accessToken, adAccountId } = credentials;

    // Test connection
    const fetcher = new MetaFetcher({
      appId,
      appSecret,
      accessToken,
      adAccountId,
    });

    const testResult = await fetcher.testConnection();

    if (!testResult.success) {
      throw new Error(`Failed to connect to Meta: ${testResult.error}`);
    }

    // Check if connection already exists
    const existingConnection = await prisma.metaConnection.findFirst({
      where: {
        userId,
        adAccountId,
      },
    });

    if (existingConnection) {
      // Update existing connection
      return prisma.metaConnection.update({
        where: { id: existingConnection.id },
        data: {
          appId,
          appSecret,
          accessToken,
          accountName: testResult.accountName || 'Meta Ads Account',
          status: 'active',
          lastSyncAt: null,
          syncError: null,
          updatedAt: new Date(),
        },
      });
    }

    // Create new connection
    return prisma.metaConnection.create({
      data: {
        userId,
        appId,
        appSecret,
        accessToken,
        adAccountId,
        accountName: testResult.accountName || 'Meta Ads Account',
        status: 'active',
      },
    });
  }

  /**
   * Get all connections for a user
   */
  async getConnections(userId: string): Promise<any[]> {
    const connections = await prisma.metaConnection.findMany({
      where: { userId },
      select: {
        id: true,
        accountName: true,
        adAccountId: true,
        status: true,
        lastSyncAt: true,
        syncError: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get campaign count for each connection
    return Promise.all(
      connections.map(async (connection: any) => {
        const campaignCount = await prisma.metaCampaign.count({
          where: { connectionId: connection.id },
        });

        return {
          ...connection,
          campaignCount,
        };
      })
    );
  }

  /**
   * Delete a connection
   */
  async deleteConnection(userId: string, connectionId: string): Promise<void> {
    // Verify ownership
    const connection = await prisma.metaConnection.findFirst({
      where: { id: connectionId, userId },
    });

    if (!connection) {
      throw new Error('Connection not found');
    }

    // Delete campaigns first
    await prisma.metaCampaign.deleteMany({
      where: { connectionId },
    });

    // Delete connection
    await prisma.metaConnection.delete({
      where: { id: connectionId },
    });
  }

  /**
   * Sync campaigns for a connection
   */
  async syncCampaigns(
    userId: string,
    connectionId: string,
    dateRange: string = 'last_30d'
  ): Promise<{ campaignsSynced: number; syncedAt: Date }> {
    // 1. Verify ownership
    let connection;
    try {
      connection = await prisma.metaConnection.findFirst({
        where: { id: connectionId, userId },
      });
    } catch (e) {
      const { data } = await supabase
        .from('MetaConnection')
        .select('*')
        .eq('id', connectionId)
        .eq('userId', userId)
        .single();
      connection = data;
    }

    if (!connection) {
      throw new Error('Connection not found');
    }

    // 2. Update status to syncing
    try {
      await prisma.metaConnection.update({
        where: { id: connectionId },
        data: { status: 'syncing', syncError: null },
      });
    } catch (e) {
      await supabase
        .from('MetaConnection')
        .update({ status: 'syncing', syncError: null })
        .eq('id', connectionId);
    }

    try {
      // 3. Fetch data from Meta
      const fetcher = new MetaFetcher({
        appId: connection.appId,
        appSecret: connection.appSecret,
        accessToken: connection.accessToken,
        adAccountId: connection.adAccountId,
      });

      const campaigns = await fetcher.fetchAllCampaigns({ dateRange });

      // 4. Store campaigns in database
      for (const campaign of campaigns) {
        const campaignData = {
          metaCampaignId: campaign.metaCampaignId,
          connectionId,
          name: campaign.name,
          status: campaign.status,
          objective: campaign.objective,
          dailyBudget: campaign.dailyBudget,
          lifetimeBudget: campaign.lifetimeBudget,
          spend: campaign.spend,
          impressions: campaign.impressions,
          clicks: campaign.clicks,
          ctr: campaign.ctr,
          cpc: campaign.cpc,
          cpm: campaign.cpm || 0,
          reach: campaign.reach,
          uniqueClicks: campaign.uniqueClicks || 0,
          socialSpend: campaign.socialSpend || 0,
          costPerUniqueClick: campaign.costPerUniqueClick || 0,
          frequency: campaign.frequency,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          clientId: connection.appClientId,
          syncedAt: new Date(),
          updatedAt: new Date(),
        };

        try {
          // Prisma Upsert
          const existing = await prisma.metaCampaign.findFirst({
            where: { metaCampaignId: campaign.metaCampaignId, connectionId },
          });

          if (existing) {
            await prisma.metaCampaign.update({
              where: { id: existing.id },
              data: campaignData,
            });
          } else {
            await prisma.metaCampaign.create({
              data: { ...campaignData, id: crypto.randomUUID() },
            });
          }
        } catch (prismaError) {
          // Supabase Fallback Upsert
          const { data: existing } = await supabase
            .from('MetaCampaign')
            .select('id')
            .eq('metaCampaignId', campaign.metaCampaignId)
            .eq('connectionId', connectionId)
            .maybeSingle();

          if (existing) {
            await supabase
              .from('MetaCampaign')
              .update(campaignData)
              .eq('id', existing.id);
          } else {
            await supabase
              .from('MetaCampaign')
              .insert([{ ...campaignData, id: crypto.randomUUID() }]);
          }
        }
      }

      // 5. Update connection status
      const syncedAt = new Date();
      try {
        await prisma.metaConnection.update({
          where: { id: connectionId },
          data: { status: 'active', lastSyncAt: syncedAt, syncError: null },
        });
      } catch (e) {
        await supabase
          .from('MetaConnection')
          .update({ status: 'active', lastSyncAt: syncedAt, syncError: null })
          .eq('id', connectionId);
      }

      // 6. Run unified sync (ignore errors to ensure we return success)
      try {
        await unifiedSyncService.upsertUnifiedCampaigns(userId);
      } catch (syncErr) {
        console.error('Unified sync background error:', syncErr);
      }

      return { campaignsSynced: campaigns.length, syncedAt };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      try {
        await prisma.metaConnection.update({
          where: { id: connectionId },
          data: { status: 'error', syncError: errorMsg },
        });
      } catch (e) {
        await supabase
          .from('MetaConnection')
          .update({ status: 'error', syncError: errorMsg })
          .eq('id', connectionId);
      }
      throw error;
    }
  }


  /**
   * Get connection status
   */
  async getConnectionStatus(userId: string, connectionId: string): Promise<any> {
    const connection = await prisma.metaConnection.findFirst({
      where: { id: connectionId, userId },
      select: {
        id: true,
        accountName: true,
        adAccountId: true,
        status: true,
        lastSyncAt: true,
        syncError: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!connection) {
      throw new Error('Connection not found');
    }

    const campaignCount = await prisma.metaCampaign.count({
      where: { connectionId },
    });

    return {
      ...connection,
      campaignCount,
    };
  }

  /**
   * Get campaigns for a connection
   */
  async getCampaigns(userId: string, connectionId: string): Promise<any[]> {
    // Verify ownership
    const connection = await prisma.metaConnection.findFirst({
      where: { id: connectionId, userId },
    });

    if (!connection) {
      throw new Error('Connection not found');
    }

    return prisma.metaCampaign.findMany({
      where: { connectionId },
      orderBy: {
        syncedAt: 'desc',
      },
    });
  }

  /**
   * Test connection credentials
   */
  async testConnection(
    credentials: MetaConnectionData
  ): Promise<{ success: boolean; accountName?: string; error?: string }> {
    const fetcher = new MetaFetcher(credentials);
    return fetcher.testConnection();
  }
}

export default new MetaService();
