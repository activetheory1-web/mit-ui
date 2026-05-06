export interface TransformedGoogleCampaign {
  id?: string;
  campaignId: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  roas: number;
  reach: number;
}

export class GoogleTransformer {
  /**
   * Transforms raw Google Ads response into our standard Campaign format
   */
  static transformCampaigns(rawCampaigns: any[]): TransformedGoogleCampaign[] {
    return rawCampaigns.map(campaign => {
      // Extract data safely
      const c = campaign.campaign || {};
      const m = campaign.metrics || {};

      // Convert cost from micros to standard currency
      const spend = (m.cost_micros || 0) / 1000000;
      const impressions = m.impressions || 0;
      const clicks = m.clicks || 0;
      const conversions = m.conversions || 0;
      const conversionsValue = m.conversions_value || 0;

      // Calculate derived metrics
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const cpc = clicks > 0 ? spend / clicks : 0;
      const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
      const roas = spend > 0 ? conversionsValue / spend : 0;

      // Map status
      let status = 'PAUSED';
      if (c.status === 'ENABLED') status = 'ACTIVE';
      else if (c.status === 'REMOVED') status = 'ARCHIVED';

      return {
        campaignId: c.id?.toString() || 'unknown',
        name: c.name || 'Unnamed Campaign',
        status,
        spend,
        impressions,
        clicks,
        ctr,
        cpc,
        cpm,
        conversions,
        roas,
        reach: impressions, // Google impressions as proxy for reach in unified schema
      };
    });
  }
}
