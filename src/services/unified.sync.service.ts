import prisma from '../config/database';
import { supabase } from '../config/supabase';

export class UnifiedSyncService {
  /**
   * Upserts platform-specific campaigns into the unified Campaign table.
   */
  async upsertUnifiedCampaigns(userId: string) {
    try {
      console.log(`Starting unified sync for user: ${userId}`);

      // 1. Find a valid Client to attach these campaigns to.
      let tenant = await prisma.tenant.findUnique({
        where: { userId },
        include: { clients: true },
      });

      if (!tenant) {
        // Create dev_tenant if it doesn't exist
        console.log(`Creating default tenant for user ${userId}`);
        tenant = await prisma.tenant.create({
          data: {
            id: 'dev_tenant',
            name: 'Default Workspace',
            userId: userId,
          },
          include: { clients: true }
        }).catch(e => {
           // If it already exists or fail, try fetching it
           return prisma.tenant.findFirst({ where: { userId }, include: { clients: true } });
        }) as any;
      }

      let defaultClientId: string;
      if (!tenant || tenant.clients.length === 0) {
        // Create a default client if none exist
        console.log(`Creating default client for tenant ${tenant?.id}`);
        const newClient = await prisma.client.create({
          data: {
            id: 'dev_client',
            name: 'Default Client',
            industry: 'Technology',
            tenantId: tenant?.id || 'dev_tenant',
            platforms: ['Meta', 'Google Ads']
          }
        }).catch(e => {
           return prisma.client.findFirst({ where: { tenantId: tenant?.id || 'dev_tenant' } });
        }) as any;
        
        if (!newClient) {
          console.error(`Could not find or create a client for unified sync.`);
          return;
        }
        
        defaultClientId = newClient.id;
      } else {
        defaultClientId = tenant.clients[0].id;
      }



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
        const campaignData = {
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
          frequency: mc.frequency,
          updatedAt: new Date().toISOString(),
        };

        // Save to Prisma (Primary)
        try {
          await prisma.campaign.upsert({
            where: { id: mc.metaCampaignId },
            update: campaignData,
            create: { ...campaignData, change: 0 },
          });
        } catch (e) {
          console.warn('Prisma upsert failed for Meta campaign, skipping to Supabase');
        }

        // Save to Supabase (Fallback/Sync Layer)
        try {
          await supabase.from('Campaign').upsert(campaignData);
        } catch (sError) {
          console.error('Supabase upsert failed for Meta campaign:', sError);
        }
      }

      // 5. Batch upsert Google campaigns
      for (const gc of allGoogleCampaigns) {
        const campaignData = {
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
          updatedAt: new Date().toISOString(),
        };

        // Save to Prisma (Primary)
        try {
          await prisma.campaign.upsert({
            where: { id: gc.googleCampaignId },
            update: campaignData,
            create: { ...campaignData, change: 0, frequency: 0 },
          });
        } catch (e) {
          console.warn('Prisma upsert failed for Google campaign, skipping to Supabase');
        }

        // Save to Supabase (Fallback/Sync Layer)
        try {
          await supabase.from('Campaign').upsert(campaignData);
        } catch (sError) {
          console.error('Supabase upsert failed for Google campaign:', sError);
        }
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
