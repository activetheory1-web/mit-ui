export interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective?: string;
  daily_budget?: number;
  lifetime_budget?: number;
  start_time?: string;
  end_time?: string;
}

export interface MetaInsights {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  reach: number;
  frequency: number;
  social_spend: number;
  unique_clicks: number;
  unique_ctr: number;
  cost_per_unique_click: number;
  inline_link_clicks: number;
  inline_link_click_ctr: number;
  cost_per_inline_link_click: number;
}

export interface TransformedCampaign {
  metaCampaignId: string;
  name: string;
  status: string;
  objective?: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  reach: number;
  frequency: number;
  socialSpend: number;
  uniqueClicks: number;
  uniqueCtr: number;
  costPerUniqueClick: number;
  inlineLinkClicks: number;
  inlineLinkClickCtr: number;
  costPerInlineLinkClick: number;
  startDate?: Date;
  endDate?: Date;
}

export class MetaTransformer {
  /**
   * Transform Meta campaign data to internal format
   */
  static transformCampaign(campaign: MetaCampaign): Partial<TransformedCampaign> {
    return {
      metaCampaignId: campaign.id,
      name: campaign.name,
      status: this.normalizeStatus(campaign.status),
      objective: campaign.objective,
      dailyBudget: campaign.daily_budget ? campaign.daily_budget / 100 : undefined,
      lifetimeBudget: campaign.lifetime_budget ? campaign.lifetime_budget / 100 : undefined,
      startDate: campaign.start_time ? new Date(campaign.start_time) : undefined,
      endDate: campaign.end_time ? new Date(campaign.end_time) : undefined,
    };
  }

  /**
   * Transform Meta insights to internal format
   */
  static transformInsights(insights: MetaInsights): Partial<TransformedCampaign> {
    return {
      spend: Number(insights.spend || 0),
      impressions: Number(insights.impressions || 0),
      clicks: Number(insights.clicks || 0),
      ctr: Number(insights.ctr || 0),
      cpc: Number(insights.cpc || 0),
      cpm: Number(insights.cpm || 0),
      reach: Number(insights.reach || 0),
      frequency: Number(insights.frequency || 0),
      socialSpend: Number(insights.social_spend || 0),
      uniqueClicks: Number(insights.unique_clicks || 0),
      uniqueCtr: Number(insights.unique_ctr || 0),
      costPerUniqueClick: Number(insights.cost_per_unique_click || 0),
      inlineLinkClicks: Number(insights.inline_link_clicks || 0),
      inlineLinkClickCtr: Number(insights.inline_link_click_ctr || 0),
      costPerInlineLinkClick: Number(insights.cost_per_inline_link_click || 0),
    };
  }

  /**
   * Combine campaign and insights data
   */
  static combineCampaignData(campaign: MetaCampaign, insights?: MetaInsights): TransformedCampaign {
    const campaignData = this.transformCampaign(campaign);
    const insightsData = insights ? this.transformInsights(insights) : {};

    return {
      ...campaignData,
      ...insightsData,
      metaCampaignId: campaignData.metaCampaignId!,
      name: campaignData.name!,
      status: campaignData.status!,
      spend: insightsData.spend || 0,
      impressions: insightsData.impressions || 0,
      clicks: insightsData.clicks || 0,
      ctr: insightsData.ctr || 0,
      cpc: insightsData.cpc || 0,
      cpm: insightsData.cpm || 0,
      reach: insightsData.reach || 0,
      frequency: insightsData.frequency || 0,
      socialSpend: insightsData.socialSpend || 0,
      uniqueClicks: insightsData.uniqueClicks || 0,
      uniqueCtr: insightsData.uniqueCtr || 0,
      costPerUniqueClick: insightsData.costPerUniqueClick || 0,
      inlineLinkClicks: insightsData.inlineLinkClicks || 0,
      inlineLinkClickCtr: insightsData.inlineLinkClickCtr || 0,
      costPerInlineLinkClick: insightsData.costPerInlineLinkClick || 0,
    };
  }

  /**
   * Normalize Meta status to internal format
   */
  private static normalizeStatus(status: string): string {
    const statusMap: Record<string, string> = {
      ACTIVE: 'active',
      PAUSED: 'paused',
      ARCHIVED: 'archived',
      DELETED: 'deleted',
    };

    return statusMap[status.toUpperCase()] || status.toLowerCase();
  }

  /**
   * Transform array of campaigns with their insights
   */
  static transformCampaignsArray(
    campaigns: MetaCampaign[],
    insightsMap: Map<string, MetaInsights>
  ): TransformedCampaign[] {
    return campaigns.map(campaign => {
      const insights = insightsMap.get(campaign.id);
      return this.combineCampaignData(campaign, insights);
    });
  }

  /**
   * Calculate derived metrics if not provided
   */
  static calculateMetrics(data: Partial<TransformedCampaign>): Partial<TransformedCampaign> {
    const result = { ...data };

    // Calculate CTR if not provided
    if (!result.ctr && result.impressions && result.clicks) {
      result.ctr = (result.clicks / result.impressions) * 100;
    }

    // Calculate CPC if not provided
    if (!result.cpc && result.clicks && result.spend) {
      result.cpc = result.spend / result.clicks;
    }

    // Calculate CPM if not provided
    if (!result.cpm && result.impressions && result.spend) {
      result.cpm = (result.spend / result.impressions) * 1000;
    }

    return result;
  }

  /**
   * Validate transformed data
   */
  static validateCampaign(data: TransformedCampaign): boolean {
    return !!(
      data.metaCampaignId &&
      data.name &&
      data.status &&
      typeof data.spend === 'number' &&
      typeof data.impressions === 'number' &&
      typeof data.clicks === 'number'
    );
  }
}

export default MetaTransformer;
