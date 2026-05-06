import prisma from '../config/database';

export class UnifiedSyncService {
  /**
   * Upserts platform-specific campaigns into the unified Campaign table.
   */
  async upsertUnifiedCampaigns(userId: string) {
    try {
      console.log(`Starting unified sync for user: ${userId}`);

      // 1. Find a valid Client to attach these campaigns to.
      const tenant = await prisma.tenant.findUnique({
        where: { userId },
        include: { clients: true },
      });

      if (!tenant || tenant.clients.length === 0) {
        console.warn(`No clients found for user ${userId}. Skipping unified sync.`);
        return;
      }

      const defaultClientId = tenant.clients[0].id;

      // 2. Fetch all Meta campaigns for this user's connections
      const metaConnections = await prisma.metaConnection.findMany({
        where: { userId },
        include: { campaigns: true },
      });

      const allMetaCampaigns = metaConnections.flatMap(conn => conn.campaigns);

      // 3. Fetch all Google campaigns for this user's connections
      const googleConnections = await prisma.googleConnection.findMany({
        where: { userId },
        include: { campaigns: true },
      });

      const allGoogleCampaigns = googleConnections.flatMap(conn => conn.campaigns);

      // 4. Batch upsert Meta campaigns
      for (const mc of allMetaCampaigns) {
        await prisma.campaign.upsert({
          where: { id: mc.metaCampaignId }, // Using the platform ID as the primary key here to prevent duplicates
          update: {
            name: mc.name,
            channel: 'Meta',
            spend: mc.spend,
            budget: mc.dailyBudget || mc.lifetimeBudget || 0,
            impressions: Number(mc.impressions),
            clicks: Number(mc.clicks),
            ctr: mc.ctr,
            cpc: mc.cpc,
            conv: 0, // Meta doesn't have conv in schema right now, fallback
            roas: 0,
            status: mc.status,
            active: mc.status === 'ACTIVE',
            frequency: mc.frequency,
            updatedAt: new Date(),
          },
          create: {
            id: mc.metaCampaignId,
            name: mc.name,
            clientId: defaultClientId,
            channel: 'Meta',
            spend: mc.spend,
            budget: mc.dailyBudget || mc.lifetimeBudget || 0,
            impressions: Number(mc.impressions),
            clicks: Number(mc.clicks),
            ctr: mc.ctr,
            cpc: mc.cpc,
            conv: 0,
            roas: 0,
            status: mc.status,
            active: mc.status === 'ACTIVE',
            change: 0,
            frequency: mc.frequency,
          },
        });
      }

      // 5. Batch upsert Google campaigns
      for (const gc of allGoogleCampaigns) {
        await prisma.campaign.upsert({
          where: { id: gc.googleCampaignId },
          update: {
            name: gc.name,
            channel: 'Google Ads',
            spend: gc.spend,
            budget: 0, // Google doesn't have explicit budget in this schema level yet
            impressions: Number(gc.impressions),
            clicks: Number(gc.clicks),
            ctr: gc.ctr,
            cpc: gc.cpc,
            conv: gc.conversions,
            roas: 0, // roas calculation could be added if conversionValue existed
            status: gc.status,
            active: gc.status === 'ACTIVE',
            updatedAt: new Date(),
          },
          create: {
            id: gc.googleCampaignId,
            name: gc.name,
            clientId: defaultClientId,
            channel: 'Google Ads',
            spend: gc.spend,
            budget: 0,
            impressions: Number(gc.impressions),
            clicks: Number(gc.clicks),
            ctr: gc.ctr,
            cpc: gc.cpc,
            conv: gc.conversions,
            roas: 0,
            status: gc.status,
            active: gc.status === 'ACTIVE',
            change: 0,
            frequency: 0,
          },
        });
      }

      console.log(
        `Unified sync completed. Synced ${allMetaCampaigns.length} Meta and ${allGoogleCampaigns.length} Google campaigns.`
      );
    } catch (error) {
      console.error('Unified sync failed:', error);
    }
  }
}

export default new UnifiedSyncService();
