import prisma from '../config/database';
import { supabase } from '../config/supabase';
import { executeWidgetQueryLocal } from '../integrations/local/local.queries';

export class AISnapshotService {
  /**
   * Generates a concise text summary of client performance for LLM context.
   */
  static async getClientSnapshot(clientId?: string): Promise<string> {
    try {
      // Fetch Client Metadata
      let client: any = null;
      try {
        client = await prisma.client.findUnique({
          where: { id: clientId },
          include: { tenant: true }
        });
      } catch (prismaError) {
        console.warn('Prisma client lookup failed for AI snapshot, falling back to Supabase');
        if (clientId) {
          const { data, error } = await supabase
            .from('Client')
            .select('*')
            .eq('id', clientId)
            .single();
          if (!error && data) client = data;
        }
      }

      // Fetch data for all widgets (simplified)
      const data = await executeWidgetQueryLocal({ source_filter: 'both' }, clientId);

      if (!data || data.length === 0) {
        return `CONTEXT: We are looking at data for client "${client?.name || 'Unknown'}" in the ${client?.industry || 'unknown'} industry. However, no campaign data was found for this client.`;
      }

      const totalSpend = data.reduce((sum, c) => sum + (c.spend || 0), 0);
      const totalClicks = data.reduce((sum, c) => sum + (c.clicks || 0), 0);
      const totalImpressions = data.reduce((sum, c) => sum + (c.impressions || 0), 0);
      const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

      // Sort to find top campaign
      const topCampaign = [...data].sort((a, b) => b.spend - a.spend)[0];
      const bestCtrCampaign = [...data].sort((a, b) => b.ctr - a.ctr)[0];

      let snapshot = `ACTIVE CLIENT DATA SNAPSHOT:\n`;
      snapshot += `CLIENT INFO:\n`;
      const clientMetadata = client as any;
      snapshot += `- Name: ${clientMetadata?.name}\n`;
      snapshot += `- Industry: ${clientMetadata?.industry}\n`;
      snapshot += `- Monthly Budget: ₹${clientMetadata?.monthlyBudget?.toLocaleString()}\n`;
      snapshot += `- Account Manager: ${clientMetadata?.accountManager}\n`;
      snapshot += `- Platforms: ${clientMetadata?.platforms?.join(', ') || ''}\n\n`;

      snapshot += `PERFORMANCE SUMMARY:\n`;
      snapshot += `- Total Campaigns: ${data.length}\n`;
      snapshot += `- Total Spend: ₹${totalSpend.toLocaleString()}\n`;
      snapshot += `- Total Clicks: ${totalClicks.toLocaleString()}\n`;
      snapshot += `- Avg CTR: ${avgCtr.toFixed(2)}%\n`;
      snapshot += `- Top Campaign (by Spend): "${topCampaign.campaign_name}" (₹${topCampaign.spend.toLocaleString()})\n`;
      snapshot += `- Best Performing Campaign (by CTR): "${bestCtrCampaign.campaign_name}" (${bestCtrCampaign.ctr.toFixed(2)}%)\n`;

      // Break down by source
      const metaData = data.filter(c => c.source === 'Meta');
      const googleData = data.filter(c => c.source === 'Google');

      if (metaData.length > 0) {
        const metaSpend = metaData.reduce((sum, c) => sum + (c.spend || 0), 0);
        snapshot += `- Meta Ads: ${metaData.length} campaigns, ₹${metaSpend.toLocaleString()} spend\n`;
      }
      if (googleData.length > 0) {
        const googleSpend = googleData.reduce((sum, c) => sum + (c.spend || 0), 0);
        snapshot += `- Google Ads: ${googleData.length} campaigns, ₹${googleSpend.toLocaleString()} spend\n`;
      }

      return snapshot;
    } catch (error) {
      console.error('Failed to generate AI snapshot:', error);
      return "Could not retrieve real-time data context.";
    }
  }
}

export default AISnapshotService;
