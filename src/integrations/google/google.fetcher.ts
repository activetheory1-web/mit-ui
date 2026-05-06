import { GoogleAdsApi } from 'google-ads-api';

export interface GoogleAdsCredentials {
  clientId: string;
  clientSecret: string;
  developerToken: string;
  refreshToken: string;
  customerId: string;
}

export class GoogleFetcher {
  private client: any;
  private customer: any;
  private customerId: string;

  constructor(credentials: GoogleAdsCredentials) {
    this.customerId = credentials.customerId;

    // Initialize Google Ads API Client
    this.client = new GoogleAdsApi({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      developer_token: credentials.developerToken,
    });

    this.customer = this.client.Customer({
      customer_id: this.customerId,
      refresh_token: credentials.refreshToken,
    });
  }

  /**
   * Tests the connection by querying customer details
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.customer.query(`
        SELECT customer.id, customer.descriptive_name 
        FROM customer 
        LIMIT 1
      `);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to connect to Google Ads' };
    }
  }

  /**
   * Fetches campaigns and their metrics
   */
  async fetchCampaigns(dateRange: string = 'LAST_30_DAYS'): Promise<any[]> {
    try {
      const query = `
        SELECT
          campaign.id,
          campaign.name,
          campaign.status,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value
        FROM campaign
        WHERE segments.date DURING ${dateRange}
      `;

      const response = await this.customer.query(query);
      return response;
    } catch (error: any) {
      console.error('Error fetching Google Ads campaigns:', error);
      throw new Error(`Failed to fetch Google campaigns: ${error.message}`);
    }
  }
}
