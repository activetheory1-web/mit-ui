import prisma from '../config/database';
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
    // Verify ownership
    const connection = await prisma.metaConnection.findFirst({
      where: { id: connectionId, userId },
    });

    if (!connection) {
      throw new Error('Connection not found');
    }

    // Update status to syncing
    await prisma.metaConnection.update({
      where: { id: connectionId },
      data: {
        status: 'syncing',
        syncError: null,
      },
    });

    try {
      // Fetch data from Meta
      const fetcher = new MetaFetcher({
        appId: connection.appId,
        appSecret: connection.appSecret,
        accessToken: connection.accessToken,
        adAccountId: connection.adAccountId,
      });

      const campaigns = await fetcher.fetchAllCampaigns({ dateRange });

      // Store campaigns in database
      for (const campaign of campaigns) {
        const existingCampaign = await prisma.metaCampaign.findFirst({
          where: {
            metaCampaignId: campaign.metaCampaignId,
            connectionId,
          },
        });

        if (existingCampaign) {
          // Update existing campaign
          await prisma.metaCampaign.update({
            where: { id: existingCampaign.id },
            data: {
              name: campaign.name,
              status: campaign.status,
              objective: campaign.objective,
              dailyBudget: campaign.dailyBudget,
              lifetimeBudget: campaign.lifetimeBudget,
              spend: campaign.spend,
              impressions: BigInt(campaign.impressions),
              clicks: BigInt(campaign.clicks),
              ctr: campaign.ctr,
              cpc: campaign.cpc,
              cpm: campaign.cpm || 0,
              reach: BigInt(campaign.reach),
              uniqueClicks: BigInt(campaign.uniqueClicks || 0),
              socialSpend: campaign.socialSpend || 0,
              costPerUniqueClick: campaign.costPerUniqueClick || 0,
              frequency: campaign.frequency,
              startDate: campaign.startDate,
              endDate: campaign.endDate,
              clientId: connection.appClientId,
              syncedAt: new Date(),
              updatedAt: new Date(),
            },
          });
        } else {
          // Create new campaign
          await prisma.metaCampaign.create({
            data: {
              metaCampaignId: campaign.metaCampaignId,
              connectionId,
              name: campaign.name,
              status: campaign.status,
              objective: campaign.objective,
              dailyBudget: campaign.dailyBudget,
              lifetimeBudget: campaign.lifetimeBudget,
              spend: campaign.spend,
              impressions: BigInt(campaign.impressions),
              clicks: BigInt(campaign.clicks),
              ctr: campaign.ctr,
              cpc: campaign.cpc,
              cpm: campaign.cpm || 0,
              reach: BigInt(campaign.reach),
              uniqueClicks: BigInt(campaign.uniqueClicks || 0),
              socialSpend: campaign.socialSpend || 0,
              costPerUniqueClick: campaign.costPerUniqueClick || 0,
              frequency: campaign.frequency,
              startDate: campaign.startDate,
              endDate: campaign.endDate,
              clientId: connection.appClientId,
            },
          });
        }
      }

      // Update connection status
      const syncedAt = new Date();
      await prisma.metaConnection.update({
        where: { id: connectionId },
        data: {
          status: 'active',
          lastSyncAt: syncedAt,
          syncError: null,
        },
      });
      // Run unified sync
      await unifiedSyncService.upsertUnifiedCampaigns(userId);

      return {
        campaignsSynced: campaigns.length,
        syncedAt,
      };
    } catch (error) {
      // Update connection status with error
      await prisma.metaConnection.update({
        where: { id: connectionId },
        data: {
          status: 'error',
          syncError: error instanceof Error ? error.message : 'Unknown error',
        },
      });

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
