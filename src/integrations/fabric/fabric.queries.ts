import { getFabricConnection } from './fabric.client';
import sql from 'mssql';

export async function executeWidgetQuery(tenantId: string, widget: any): Promise<any[]> {
  try {
    const pool = await getFabricConnection();
    const request = pool.request();

    // Mandatory isolation rule
    request.input('tenantId', sql.VarChar, tenantId);

    let query = `
      SELECT
        campaign_name, source, campaign_status, spend, impressions, clicks, ctr, cpc, reach, date
      FROM GOLD_CAMPAIGN_DAILY
      WHERE tenant_id = @tenantId
    `;

    // Apply source filter if requested by the AI
    if (widget.source_filter && widget.source_filter !== 'both') {
      request.input('source', sql.VarChar, widget.source_filter === 'Google' ? 'google_ads' : 'meta_ads');
      query += ` AND source = @source`;
    }

    // Apply date range filter if specified
    if (widget.dateRangeDays) {
      request.input('dateRangeDays', sql.Int, widget.dateRangeDays);
      query += ` AND date >= DATEADD(day, -@dateRangeDays, GETDATE())`;
    }

    const result = await request.query(query);
    return result.recordset || [];
  } catch (error) {
    console.error('Fabric SQL Execution Error:', error);
    // Graceful fallback: return empty array so dashboard renders empty states instead of crashing completely
    return [];
  }
}
