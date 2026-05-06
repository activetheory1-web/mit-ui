import prisma from '../config/database';
import { supabase } from '../config/supabase';

export class UnifiedSyncService {
  /**
   * Upserts platform-specific campaigns into the unified Campaign table.
   */
  async upsertUnifiedCampaigns(userId: string) {
    try {
      console.log(`Starting unified sync for user: ${userId}`);

      // 1. Find a valid Client
      let tenant;
      try {
        tenant = await prisma.tenant.findUnique({
          where: { userId },
          include: { clients: true },
        });
      } catch (e) {
        const { data: tData } = await supabase
          .from('Tenant')
          .select('*, clients:Client(*)')
          .eq('userId', userId)
          .maybeSingle();
        tenant = tData;
      }

      if (!tenant) {
        console.warn(`No tenant found for user ${userId}, using default values`);
      }

      const clients = tenant?.clients || [];
      const defaultClientId = clients.length > 0 ? clients[0].id : 'dev_client';

      // 2. Fetch all Meta campaigns
      let metaConnections: any[] = [];
      try {
        metaConnections = await prisma.metaConnection.findMany({
          where: { userId },
          include: { campaigns: true },
        }) as any[];
      } catch (e) {
        const { data } = await supabase
          .from('MetaConnection')
          .select('*, campaigns:MetaCampaign(*)')
          .eq('userId', userId);
        metaConnections = data || [];
      }

      const allMetaCampaigns = metaConnections.flatMap(conn => conn.campaigns || []);

      // 3. Fetch all Google campaigns
      let googleConnections: any[] = [];
      try {
        googleConnections = await prisma.googleConnection.findMany({
          where: { userId },
          include: { campaigns: true },
        }) as any[];
      } catch (e) {
        const { data } = await supabase
          .from('GoogleConnection')
          .select('*, campaigns:GoogleConnection(*)') // Note: Google table naming might vary
          .eq('userId', userId);
        googleConnections = data || [];
      }

      const allGoogleCampaigns = googleConnections.flatMap(conn => conn.campaigns || []);

      // 4. Batch upsert Meta campaigns
      for (const mc of allMetaCampaigns) {
        const campaignData = {
          id: mc.metaCampaignId,
          name: mc.name,
          clientId: mc.clientId || defaultClientId,
          channel: 'Meta',
          spend: Number(mc.spend),
          budget: Number(mc.dailyBudget || mc.lifetimeBudget || 0),
          impressions: Number(mc.impressions),
          clicks: Number(mc.clicks),
          ctr: Number(mc.ctr),
          cpc: Number(mc.cpc),
          conv: 0,
          roas: 0,
          status: mc.status,
          active: mc.status === 'ACTIVE' || mc.status === 'active',
          frequency: Number(mc.frequency || 0),
          updatedAt: new Date().toISOString(),
        };

        try {
          await prisma.campaign.upsert({
            where: { id: mc.metaCampaignId },
            update: campaignData,
            create: { ...campaignData, change: 0 },
          });
        } catch (e) {
          // Fallback to Supabase REST API
          const { error } = await supabase.from('Campaign').upsert([{ ...campaignData, change: 0 }]);
          if (error) console.error('Supabase upsert failed for Meta campaign:', error);
        }
      }

      // 5. Batch upsert Google campaigns
      for (const gc of allGoogleCampaigns) {
        const campaignData = {
          id: gc.googleCampaignId,
          name: gc.name,
          clientId: gc.clientId || defaultClientId,
          channel: 'Google Ads',
          spend: Number(gc.spend),
          budget: 0,
          impressions: Number(gc.impressions),
          clicks: Number(gc.clicks),
          ctr: Number(gc.ctr),
          cpc: Number(gc.cpc),
          conv: Number(gc.conversions || 0),
          roas: 0,
          status: gc.status,
          active: gc.status === 'ACTIVE' || gc.status === 'active',
          updatedAt: new Date().toISOString(),
        };

        try {
          await prisma.campaign.upsert({
            where: { id: gc.googleCampaignId },
            update: campaignData,
            create: { ...campaignData, change: 0, frequency: 0 },
          });
        } catch (e) {
          // Fallback to Supabase REST API
          const { error } = await supabase.from('Campaign').upsert([{ ...campaignData, change: 0, frequency: 0 }]);
          if (error) console.error('Supabase upsert failed for Google campaign:', error);
        }
      }

      console.log(
        `Unified sync completed. Processed ${allMetaCampaigns.length} Meta and ${allGoogleCampaigns.length} Google campaigns.`
      );
    } catch (error) {
      console.error('Unified sync failed:', error);
    }
  }

}

export default new UnifiedSyncService();
