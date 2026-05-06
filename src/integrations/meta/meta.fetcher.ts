import MetaClient, { MetaCredentials, MetaCampaign, MetaInsights } from './meta.client';
import MetaTransformer, { TransformedCampaign } from './meta.transformer';

export interface FetchOptions {
  dateRange?: string;
  limit?: number;
  includeInsights?: boolean;
}

export class MetaFetcher {
  private client: MetaClient;

  constructor(credentials: MetaCredentials) {
    this.client = new MetaClient(credentials);
  }

  /**
   * Fetch all campaigns with insights
   */
  async fetchAllCampaigns(options: FetchOptions = {}): Promise<TransformedCampaign[]> {
    const { dateRange = 'last_30d', limit = 100, includeInsights = true } = options;

    try {
      // Fetch campaigns
      const campaignsResponse = await this.client.getCampaigns();
      const campaigns: MetaCampaign[] = campaignsResponse.data || [];

      // Limit campaigns if specified
      const limitedCampaigns = limit ? campaigns.slice(0, limit) : campaigns;

      if (!includeInsights) {
        return limitedCampaigns.map(campaign => MetaTransformer.combineCampaignData(campaign));
      }

      // Fetch insights for each campaign
      const insightsMap = new Map<string, MetaInsights>();

      // Fetch insights in batches to avoid rate limiting
      const batchSize = 10;
      for (let i = 0; i < limitedCampaigns.length; i += batchSize) {
        const batch = limitedCampaigns.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async campaign => {
            try {
              const insightsResponse = await this.client.getCampaignInsights(
                campaign.id,
                dateRange
              );
              const insights: MetaInsights[] = insightsResponse.data || [];

              if (insights.length > 0) {
                // Aggregate insights if multiple rows returned
                const aggregated = this.aggregateInsights(insights);
                insightsMap.set(campaign.id, aggregated);
              }
            } catch (error) {
              console.error(`Failed to fetch insights for campaign ${campaign.id}:`, error);
            }
          })
        );

        // Add delay between batches to respect rate limits
        if (i + batchSize < limitedCampaigns.length) {
          await this.delay(1000); // 1 second delay between batches
        }
      }

      // Transform and combine data
      return MetaTransformer.transformCampaignsArray(limitedCampaigns, insightsMap);
    } catch (error) {
      console.error('Failed to fetch campaigns from Meta:', error);
      throw new Error(
        `Failed to fetch campaigns: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Fetch a single campaign with insights
   */
  async fetchCampaign(
    campaignId: string,
    dateRange: string = 'last_30d'
  ): Promise<TransformedCampaign> {
    try {
      // Fetch campaign details
      const campaignResponse = await this.client.request<any>(`/${campaignId}`, {
        fields: 'id,name,status,objective,daily_budget,lifetime_budget,start_time,end_time',
      });

      const campaign: MetaCampaign = campaignResponse.data;

      // Fetch insights
      const insightsResponse = await this.client.getCampaignInsights(campaignId, dateRange);
      const insights: MetaInsights[] = insightsResponse.data || [];

      const aggregatedInsights =
        insights.length > 0 ? this.aggregateInsights(insights) : this.getEmptyInsights();

      return MetaTransformer.combineCampaignData(campaign, aggregatedInsights);
    } catch (error) {
      console.error(`Failed to fetch campaign ${campaignId}:`, error);
      throw new Error(
        `Failed to fetch campaign: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Fetch account-level insights
   */
  async fetchAccountInsights(dateRange: string = 'last_30d'): Promise<MetaInsights> {
    try {
      const insightsResponse = await this.client.getAccountInsights(dateRange);
      const insights: MetaInsights[] = insightsResponse.data || [];

      return insights.length > 0 ? this.aggregateInsights(insights) : this.getEmptyInsights();
    } catch (error) {
      console.error('Failed to fetch account insights:', error);
      throw new Error(
        `Failed to fetch account insights: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Test connection by fetching account info
   */
  async testConnection(): Promise<{ success: boolean; accountName?: string; error?: string }> {
    try {
      const accountInfo = await this.client.getAccountInfo();
      return {
        success: true,
        accountName: accountInfo.data?.name,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Aggregate multiple insight rows into one
   */
  private aggregateInsights(insights: MetaInsights[]): MetaInsights {
    if (insights.length === 0) {
      return this.getEmptyInsights();
    }

    if (insights.length === 1) {
      return insights[0];
    }

    const aggregated: MetaInsights = {
      spend: insights.reduce((sum, i) => sum + Number(i.spend || 0), 0),
      impressions: insights.reduce((sum, i) => sum + Number(i.impressions || 0), 0),
      clicks: insights.reduce((sum, i) => sum + Number(i.clicks || 0), 0),
      reach: insights.reduce((sum, i) => sum + Number(i.reach || 0), 0),
      ctr: 0,
      cpc: 0,
      cpm: 0,
      frequency: 0,
      social_spend: insights.reduce((sum, i) => sum + Number(i.social_spend || 0), 0),
      unique_clicks: insights.reduce((sum, i) => sum + Number(i.unique_clicks || 0), 0),
      unique_ctr: 0,
      cost_per_unique_click: 0,
      inline_link_clicks: insights.reduce((sum, i) => sum + Number(i.inline_link_clicks || 0), 0),
      inline_link_click_ctr: 0,
      cost_per_inline_link_click: 0,
    };

    if (aggregated.impressions > 0 && aggregated.clicks > 0) {
      aggregated.ctr = (aggregated.clicks / aggregated.impressions) * 100;
    }
    if (aggregated.clicks > 0 && aggregated.spend > 0) {
      aggregated.cpc = aggregated.spend / aggregated.clicks;
    }
    if (aggregated.impressions > 0 && aggregated.spend > 0) {
      aggregated.cpm = (aggregated.spend / aggregated.impressions) * 1000;
    }
    if (aggregated.impressions > 0 && aggregated.unique_clicks > 0) {
      aggregated.unique_ctr = (aggregated.unique_clicks / aggregated.impressions) * 100;
    }
    if (aggregated.unique_clicks > 0 && aggregated.spend > 0) {
      aggregated.cost_per_unique_click = aggregated.spend / aggregated.unique_clicks;
    }
    if (aggregated.impressions > 0 && aggregated.inline_link_clicks > 0) {
      aggregated.inline_link_click_ctr = (aggregated.inline_link_clicks / aggregated.impressions) * 100;
    }
    if (aggregated.inline_link_clicks > 0 && aggregated.spend > 0) {
      aggregated.cost_per_inline_link_click = aggregated.spend / aggregated.inline_link_clicks;
    }
    if (insights.length > 0) {
      aggregated.frequency = insights.reduce((sum, i) => sum + (i.frequency || 0), 0) / insights.length;
    }

    return aggregated;
  }

  /**
   * Get empty insights object
   */
  private getEmptyInsights(): MetaInsights {
    return {
      spend: 0, impressions: 0, clicks: 0, ctr: 0, cpc: 0, cpm: 0,
      reach: 0, frequency: 0, social_spend: 0, unique_clicks: 0,
      unique_ctr: 0, cost_per_unique_click: 0, inline_link_clicks: 0,
      inline_link_click_ctr: 0, cost_per_inline_link_click: 0,
    };
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get the underlying client (for testing)
   */
  getClient(): MetaClient {
    return this.client;
  }
}

export default MetaFetcher;
