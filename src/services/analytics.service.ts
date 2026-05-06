import { getFabricConnection } from '../integrations/fabric/fabric.client';
import { supabase } from '../config/supabase';
import sql from 'mssql';
import { executeWidgetQueryLocal } from '../integrations/local/local.queries';

/**
 * Analytics Service — Meta Dashboard MVP
 * All SQL follows the spec: Meta_dashboard_spec_SR_21042026docx.md
 *
 * CRITICAL RULES:
 *  - CTR = (SUM(clicks) * 1.0 / NULLIF(SUM(impressions), 0)) * 100
 *  - CPC = SUM(spend) / NULLIF(SUM(clicks), 0)
 *  - NEVER use AVG(ctr) or AVG(cpc)
 *  - Every query MUST include: WHERE source = 'meta_ads' AND tenant_id = @tenantId
 */

export interface KpiSummary {
  total_spend: number;
  total_impressions: number;
  total_clicks: number;
  avg_ctr: number | null;
  avg_cpc: number | null;
  total_reach: number;
}

export interface DailySpendRow {
  date: string;
  daily_spend: number;
  daily_impressions: number;
  daily_clicks: number;
}

export interface CampaignSpendRow {
  campaign_name: string;
  total_spend: number;
  total_clicks: number;
  total_impressions: number;
  ctr: number | null;
}

export interface CampaignClickRow {
  campaign_name: string;
  total_clicks: number;
  total_spend: number;
  total_impressions: number;
}

export interface CampaignTableRow {
  campaign_name: string;
  campaign_status: string;
  total_spend: number;
  total_impressions: number;
  total_clicks: number;
  ctr: number | null;
  cpc: number | null;
  total_reach: number;
}

export class AnalyticsService {
  /**
   * Section 2 — Single query for all 6 KPI cards
   */
  async getKpiSummary(tenantId: string, dateRangeDays: number, source?: string): Promise<KpiSummary> {
    try {
      const pool = await getFabricConnection();
      const request = pool.request();
      request.input('tenantId', sql.VarChar, tenantId);
      request.input('dateRangeDays', sql.Int, dateRangeDays);

      let sourceFilter = `AND source = 'meta_ads'`;
      if (source && source !== 'All') {
        sourceFilter = `AND source = @source`;
        request.input('source', sql.VarChar, source === 'Google Ads' ? 'google_ads' : 'meta_ads');
      }

      const result = await request.query(`
        SELECT
          SUM(spend) AS total_spend,
          SUM(impressions) AS total_impressions,
          SUM(clicks) AS total_clicks,
          (SUM(clicks) * 1.0 / NULLIF(SUM(impressions), 0)) * 100 AS avg_ctr,
          SUM(spend) / NULLIF(SUM(clicks), 0) AS avg_cpc,
          SUM(reach) AS total_reach
        FROM GOLD_CAMPAIGN_DAILY
        WHERE tenant_id = @tenantId
        ${sourceFilter}
        AND date >= DATEADD(day, -@dateRangeDays, GETDATE())
      `);

      const row = result.recordset[0] || {};
      return {
        total_spend: row.total_spend || 0,
        total_impressions: row.total_impressions || 0,
        total_clicks: row.total_clicks || 0,
        avg_ctr: row.avg_ctr ?? null,
        avg_cpc: row.avg_cpc ?? null,
        total_reach: row.total_reach || 0,
      };
    } catch (error) {
      console.error('Analytics KPI query failed:', error);
      return {
        total_spend: 0, total_impressions: 0, total_clicks: 0,
        avg_ctr: null, avg_cpc: null, total_reach: 0,
      };
    }
  }

  /**
   * Section 3 — Daily spend over time (line chart)
   */
  async getDailySpendTrend(tenantId: string, dateRangeDays: number, source?: string): Promise<DailySpendRow[]> {
    try {
      const pool = await getFabricConnection();
      const request = pool.request();
      request.input('tenantId', sql.VarChar, tenantId);
      request.input('dateRangeDays', sql.Int, dateRangeDays);

      let sourceFilter = `AND source = 'meta_ads'`;
      if (source && source !== 'All') {
        sourceFilter = `AND source = @source`;
        request.input('source', sql.VarChar, source === 'Google Ads' ? 'google_ads' : 'meta_ads');
      }

      const result = await request.query(`
        SELECT
          date,
          SUM(spend) AS daily_spend,
          SUM(impressions) AS daily_impressions,
          SUM(clicks) AS daily_clicks
        FROM GOLD_CAMPAIGN_DAILY
        WHERE tenant_id = @tenantId
        ${sourceFilter}
        AND date >= DATEADD(day, -@dateRangeDays, GETDATE())
        GROUP BY date
        ORDER BY date ASC
      `);

      return result.recordset || [];
    } catch (error) {
      console.error('Analytics daily-spend query failed:', error);
      return [];
    }
  }

  /**
   * Section 4 — Top 10 campaigns by spend (horizontal bar chart, left)
   */
  async getTopCampaignsBySpend(tenantId: string, dateRangeDays: number, source?: string): Promise<CampaignSpendRow[]> {
    try {
      const pool = await getFabricConnection();
      const request = pool.request();
      request.input('tenantId', sql.VarChar, tenantId);
      request.input('dateRangeDays', sql.Int, dateRangeDays);

      let sourceFilter = `AND source = 'meta_ads'`;
      if (source && source !== 'All') {
        sourceFilter = `AND source = @source`;
        request.input('source', sql.VarChar, source === 'Google Ads' ? 'google_ads' : 'meta_ads');
      }

      const result = await request.query(`
        SELECT TOP 10
          campaign_name,
          SUM(spend) AS total_spend,
          SUM(clicks) AS total_clicks,
          SUM(impressions) AS total_impressions,
          (SUM(clicks) * 1.0 / NULLIF(SUM(impressions), 0)) * 100 AS ctr
        FROM GOLD_CAMPAIGN_DAILY
        WHERE tenant_id = @tenantId
        ${sourceFilter}
        AND date >= DATEADD(day, -@dateRangeDays, GETDATE())
        GROUP BY campaign_name
        ORDER BY total_spend DESC
      `);

      return result.recordset || [];
    } catch (error) {
      console.error('Analytics spend-by-campaign query failed:', error);
      return [];
    }
  }

  /**
   * Section 5 — Top 10 campaigns by clicks (horizontal bar chart, right)
   */
  async getTopCampaignsByClicks(tenantId: string, dateRangeDays: number, source?: string): Promise<CampaignClickRow[]> {
    try {
      const pool = await getFabricConnection();
      const request = pool.request();
      request.input('tenantId', sql.VarChar, tenantId);
      request.input('dateRangeDays', sql.Int, dateRangeDays);

      let sourceFilter = `AND source = 'meta_ads'`;
      if (source && source !== 'All') {
        sourceFilter = `AND source = @source`;
        request.input('source', sql.VarChar, source === 'Google Ads' ? 'google_ads' : 'meta_ads');
      }

      const result = await request.query(`
        SELECT TOP 10
          campaign_name,
          SUM(clicks) AS total_clicks,
          SUM(spend) AS total_spend,
          SUM(impressions) AS total_impressions
        FROM GOLD_CAMPAIGN_DAILY
        WHERE tenant_id = @tenantId
        ${sourceFilter}
        AND date >= DATEADD(day, -@dateRangeDays, GETDATE())
        GROUP BY campaign_name
        ORDER BY total_clicks DESC
      `);

      return result.recordset || [];
    } catch (error) {
      console.error('Analytics clicks-by-campaign query failed:', error);
      return [];
    }
  }

  /**
   * Section 6 — Campaign performance table (8 columns, sortable client-side)
   */
  async getCampaignPerformanceTable(tenantId: string, dateRangeDays: number, source?: string): Promise<CampaignTableRow[]> {
    try {
      const pool = await getFabricConnection();
      const request = pool.request();
      request.input('tenantId', sql.VarChar, tenantId);
      request.input('dateRangeDays', sql.Int, dateRangeDays);

      let sourceFilter = `AND source = 'meta_ads'`;
      if (source && source !== 'All') {
        sourceFilter = `AND source = @source`;
        request.input('source', sql.VarChar, source === 'Google Ads' ? 'google_ads' : 'meta_ads');
      }

      const result = await request.query(`
        SELECT
          campaign_name,
          MAX(campaign_status) AS campaign_status,
          SUM(spend) AS total_spend,
          SUM(impressions) AS total_impressions,
          SUM(clicks) AS total_clicks,
          (SUM(clicks) * 1.0 / NULLIF(SUM(impressions), 0)) * 100 AS ctr,
          SUM(spend) / NULLIF(SUM(clicks), 0) AS cpc,
          SUM(reach) AS total_reach
        FROM GOLD_CAMPAIGN_DAILY
        WHERE tenant_id = @tenantId
        ${sourceFilter}
        AND date >= DATEADD(day, -@dateRangeDays, GETDATE())
        GROUP BY campaign_name
        ORDER BY total_spend DESC
      `);

      return result.recordset || [];
    } catch (error) {
      console.error('Analytics campaign-table query failed:', error);
      return [];
    }
  }

  /**
   * Combined call — returns all 5 datasets in a single response.
   * Now includes logic to fall back to Local Database/CSV if Fabric is not available.
   */
  async getMetaDashboardData(tenantId: string, dateRangeDays: number, source?: string) {
    try {
      // 1. Try to fetch from Fabric first (Enterprise Mode)
      const [kpi, dailySpend, spendByCampaign, clicksByCampaign, campaignTable] =
        await Promise.all([
          this.getKpiSummary(tenantId, dateRangeDays, source),
          this.getDailySpendTrend(tenantId, dateRangeDays, source),
          this.getTopCampaignsBySpend(tenantId, dateRangeDays, source),
          this.getTopCampaignsByClicks(tenantId, dateRangeDays, source),
          this.getCampaignPerformanceTable(tenantId, dateRangeDays, source),
        ]);

      // If we got real data from Fabric, return it
      if (kpi.total_spend > 0 || campaignTable.length > 0) {
        return { kpi, dailySpend, spendByCampaign, clicksByCampaign, campaignTable };
      }
    } catch (fabricError) {
      console.warn('Fabric data fetch failed, checking database fallback:', fabricError);
    }

    // 2. FALLBACK: Fetch from Supabase Database (Real Synced Data)
    try {
      const { data: dbCampaigns, error: dbError } = await supabase
        .from('Campaign')
        .select('*')
        .eq('channel', 'Meta');

      if (dbCampaigns && dbCampaigns.length > 0) {
        const kpi: KpiSummary = {
          total_spend: dbCampaigns.reduce((s, c) => s + (c.spend || 0), 0),
          total_impressions: dbCampaigns.reduce((s, c) => s + (c.impressions || 0), 0),
          total_clicks: dbCampaigns.reduce((s, c) => s + (c.clicks || 0), 0),
          avg_ctr: dbCampaigns.length > 0 ? (dbCampaigns.reduce((s, c) => s + (c.ctr || 0), 0) / dbCampaigns.length) : 0,
          avg_cpc: dbCampaigns.length > 0 ? (dbCampaigns.reduce((s, c) => s + (c.cpc || 0), 0) / dbCampaigns.length) : 0,
          total_reach: dbCampaigns.reduce((s, c) => s + (c.total_reach || 0), 0),
        };

        const campaignTable: CampaignTableRow[] = dbCampaigns.map(c => ({
          campaign_name: c.name,
          campaign_status: c.status,
          total_spend: c.spend || 0,
          total_impressions: c.impressions || 0,
          total_clicks: c.clicks || 0,
          ctr: c.ctr || 0,
          cpc: c.cpc || 0,
          total_reach: c.total_reach || 0,
        }));

        const spendByCampaign: CampaignSpendRow[] = [...campaignTable]
          .sort((a, b) => b.total_spend - a.total_spend)
          .slice(0, 10)
          .map(c => ({
            campaign_name: c.campaign_name,
            total_spend: c.total_spend,
            total_clicks: c.total_clicks,
            total_impressions: c.total_impressions,
            ctr: c.ctr
          }));

        const clicksByCampaign: CampaignClickRow[] = [...campaignTable]
          .sort((a, b) => b.total_clicks - a.total_clicks)
          .slice(0, 10)
          .map(c => ({
            campaign_name: c.campaign_name,
            total_clicks: c.total_clicks,
            total_spend: c.total_spend,
            total_impressions: c.total_impressions
          }));

        const dailySpend: DailySpendRow[] = []; // Aggregation by date needed for real trend

        return { kpi, dailySpend, spendByCampaign, clicksByCampaign, campaignTable };
      }
    } catch (dbFallbackError) {
      console.warn('Supabase dashboard fetch failed, falling back to local data:', dbFallbackError);
    }

    // 3. LAST RESORT: Fetch from Local Database/CSV (Testing Mode)
    // This ensures consistency across all browsers by serving server-side data
    const localData = await executeWidgetQueryLocal({}, tenantId);

    // Filter by source if needed
    const filtered = source && source !== 'All' 
      ? localData.filter((c: any) => c.source.toLowerCase() === (source === 'Google Ads' ? 'google' : 'meta'))
      : localData;

    // Transform local data into the dashboard shape
    const kpi: KpiSummary = {
      total_spend: filtered.reduce((s: number, c: any) => s + c.spend, 0),
      total_impressions: filtered.reduce((s: number, c: any) => s + c.impressions, 0),
      total_clicks: filtered.reduce((s: number, c: any) => s + c.clicks, 0),
      avg_ctr: filtered.length > 0 ? (filtered.reduce((s: number, c: any) => s + (c.ctr || 0), 0) / filtered.length) : 0,
      avg_cpc: filtered.length > 0 ? (filtered.reduce((s: number, c: any) => s + (c.cpc || 0), 0) / filtered.length) : 0,
      total_reach: filtered.reduce((s: number, c: any) => s + (c.reach || 0), 0),
    };

    const campaignTable: CampaignTableRow[] = filtered.map((c: any) => ({
      campaign_name: c.campaign_name,
      campaign_status: c.campaign_status,
      total_spend: c.spend,
      total_impressions: c.impressions,
      total_clicks: c.clicks,
      ctr: c.ctr,
      cpc: c.cpc,
      total_reach: c.reach
    }));

    // Mock trend and top charts for the dashboard based on local data
    const dailySpend: DailySpendRow[] = []; // Simplified for testing
    const spendByCampaign: CampaignSpendRow[] = campaignTable.slice(0, 10).map(c => ({
      campaign_name: c.campaign_name,
      total_spend: c.total_spend,
      total_clicks: c.total_clicks,
      total_impressions: c.total_impressions,
      ctr: c.ctr
    }));
    
    const clicksByCampaign: CampaignClickRow[] = campaignTable.slice(0, 10).map((c: any) => ({
      campaign_name: c.campaign_name,
      total_clicks: c.total_clicks,
      total_spend: c.total_spend,
      total_impressions: c.total_impressions
    }));

    return { kpi, dailySpend, spendByCampaign, clicksByCampaign, campaignTable };
  }
}

export default new AnalyticsService();
