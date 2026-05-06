import axios, { AxiosInstance } from 'axios';

export interface MetaCredentials {
  appId: string;
  appSecret: string;
  accessToken: string;
  adAccountId: string;
}

// Re-export types from transformer for convenience
export { MetaCampaign, MetaInsights } from './meta.transformer';

export interface MetaApiResponse<T> {
  data: T;
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    next?: string;
  };
  error?: {
    message: string;
    type: string;
    code: number;
  };
}

export class MetaClient {
  private client: AxiosInstance;
  private credentials: MetaCredentials;

  constructor(credentials: MetaCredentials) {
    this.credentials = credentials;
    this.client = axios.create({
      baseURL: 'https://graph.facebook.com/v19.0',
      timeout: 30000,
    });
  }

  /**
   * Make a request to Meta Graph API
   */
  async request<T>(
    endpoint: string,
    params: Record<string, any> = {}
  ): Promise<MetaApiResponse<T>> {
    try {
      const response = await this.client.get<MetaApiResponse<T>>(endpoint, {
        params: {
          access_token: this.credentials.accessToken,
          ...params,
        },
      });

      // Check for API errors
      if (response.data.error) {
        throw new Error(`Meta API Error: ${response.data.error.message}`);
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || error.message;
        throw new Error(`Meta API request failed: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Get campaigns from Meta
   */
  async getCampaigns(fields: string[] = [], filters: Record<string, any> = {}) {
    const defaultFields = [
      'id',
      'name',
      'status',
      'objective',
      'daily_budget',
      'lifetime_budget',
      'start_time',
      'end_time',
    ];

    const allFields = [...new Set([...defaultFields, ...fields])];

    return this.request<any>(`/${this.credentials.adAccountId}/campaigns`, {
      fields: allFields.join(','),
      ...filters,
    });
  }

  /**
   * Get campaign insights (metrics)
   */
  async getCampaignInsights(
    campaignId: string,
    dateRange: string = 'last_30d',
    metrics: string[] = []
  ) {
    const defaultMetrics = [
      'spend',
      'impressions',
      'clicks',
      'ctr',
      'cpc',
      'cpm',
      'reach',
      'frequency',
      'social_spend',
      'unique_clicks',
      'unique_ctr',
      'cost_per_unique_click',
      'inline_link_clicks',
      'inline_link_click_ctr',
      'cost_per_inline_link_click',
    ];

    const allMetrics = [...new Set([...defaultMetrics, ...metrics])];

    // Convert date range to Meta format
    const datePreset = this.getDatePreset(dateRange);

    return this.request<any[]>(`${campaignId}/insights`, {
      fields: allMetrics.join(','),
      date_preset: datePreset,
      level: 'campaign',
    });
  }

  /**
   * Get account-level insights
   */
  async getAccountInsights(dateRange: string = 'last_30d') {
    const metrics = ['spend', 'impressions', 'clicks', 'ctr', 'cpc', 'reach', 'frequency'];

    // Convert date range to Meta format
    const datePreset = this.getDatePreset(dateRange);

    return this.request<any[]>(`/${this.credentials.adAccountId}/insights`, {
      fields: metrics.join(','),
      date_preset: datePreset,
    });
  }

  /**
   * Get ad account info
   */
  async getAccountInfo() {
    return this.request<any>(`/${this.credentials.adAccountId}`, {
      fields: 'id,name,account_status,currency',
    });
  }

  /**
   * Test connection by making a simple API call
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getAccountInfo();
      return true;
    } catch (error) {
      console.error('Meta connection test failed:', error);
      return false;
    }
  }

  /**
   * Convert date range to Meta date_preset format
   */
  private getDatePreset(dateRange: string): string {
    const presets: Record<string, string> = {
      last_7d: 'last_7d',
      last_30d: 'last_30d',
      last_90d: 'last_90d',
      this_month: 'this_month',
      last_month: 'last_month',
      this_quarter: 'this_quarter',
      last_quarter: 'last_quarter',
      this_year: 'this_year',
      last_year: 'last_year',
      lifetime: 'lifetime',
      maximum: 'maximum',
    };

    return presets[dateRange] || 'last_30d';
  }

  /**
   * Get credentials (for debugging, don't expose in production)
   */
  getCredentials(): Omit<MetaCredentials, 'appSecret' | 'accessToken'> {
    return {
      appId: this.credentials.appId,
      adAccountId: this.credentials.adAccountId,
    };
  }
}

export default MetaClient;
