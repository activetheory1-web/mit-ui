import sql from 'mssql';

export interface WidgetSpec {
  type: 'kpi_card' | 'line_chart' | 'bar_chart' | 'table';
  title: string;
  metric?: string;
  group_by?: string | null;
  sort?: 'ASC' | 'DESC';
  limit?: number;
  source_filter?: 'Meta' | 'Google' | 'both';
  dateRangeDays?: number;
}

export interface SqlQuery {
  sql: string;
  params: Record<string, any>;
}

/**
 * Converts AI widget specs to parameterized SQL against GOLD_CAMPAIGN_DAILY.
 *
 * Rules:
 * - Every query: WHERE tenant_id = @tenantId AND source = @source AND date >= DATEADD(day, -@dateRangeDays, GETDATE())
 * - CPC always: SUM(spend) / NULLIF(SUM(clicks), 0)
 * - CTR always: (SUM(clicks) * 1.0 / NULLIF(SUM(impressions), 0)) * 100
 * - 'worst' = sort ASC, 'best'/'top' = sort DESC
 * - source_filter = 'both' removes the source clause
 */
export function widgetSpecToSql(
  widget: WidgetSpec,
  tenantId: string,
  dateRangeDays: number = 30,
  source?: string
): SqlQuery {
  const params: Record<string, any> = {
    tenantId,
    dateRangeDays,
  };

  // Build WHERE clause
  let whereClause = 'WHERE tenant_id = @tenantId';

  // Add source filter if not 'both'
  if (source && source !== 'both') {
    params.source = source === 'Google' ? 'google_ads' : 'meta_ads';
    whereClause += ' AND source = @source';
  }

  // Add date range filter
  whereClause += ' AND date >= DATEADD(day, -@dateRangeDays, GETDATE())';

  let sql = '';

  switch (widget.type) {
    case 'kpi_card':
      sql = buildKpiCardQuery(widget, whereClause, params);
      break;

    case 'line_chart':
      sql = buildLineChartQuery(widget, whereClause, params);
      break;

    case 'bar_chart':
      sql = buildBarChartQuery(widget, whereClause, params);
      break;

    case 'table':
      sql = buildTableQuery(widget, whereClause, params);
      break;

    default:
      throw new Error(`Unsupported widget type: ${widget.type}`);
  }

  return { sql, params };
}

/**
 * KPI Card Query - Returns a single aggregated value
 */
function buildKpiCardQuery(widget: WidgetSpec, whereClause: string, params: Record<string, any>): string {
  const metric = widget.metric || 'spend';

  let selectClause = '';

  switch (metric) {
    case 'spend':
      selectClause = 'SUM(spend) AS value';
      break;
    case 'impressions':
      selectClause = 'SUM(impressions) AS value';
      break;
    case 'clicks':
      selectClause = 'SUM(clicks) AS value';
      break;
    case 'ctr':
      selectClause = '(SUM(clicks) * 1.0 / NULLIF(SUM(impressions), 0)) * 100 AS value';
      break;
    case 'cpc':
      selectClause = 'SUM(spend) / NULLIF(SUM(clicks), 0) AS value';
      break;
    case 'reach':
      selectClause = 'SUM(reach) AS value';
      break;
    default:
      selectClause = `SUM(${metric}) AS value`;
  }

  return `
    SELECT ${selectClause}
    FROM GOLD_CAMPAIGN_DAILY
    ${whereClause}
  `;
}

/**
 * Line Chart Query - Returns daily trend data
 */
function buildLineChartQuery(widget: WidgetSpec, whereClause: string, params: Record<string, any>): string {
  const metric = widget.metric || 'spend';

  let valueClause = '';

  switch (metric) {
    case 'spend':
      valueClause = 'SUM(spend) AS value';
      break;
    case 'impressions':
      valueClause = 'SUM(impressions) AS value';
      break;
    case 'clicks':
      valueClause = 'SUM(clicks) AS value';
      break;
    case 'ctr':
      valueClause = '(SUM(clicks) * 1.0 / NULLIF(SUM(impressions), 0)) * 100 AS value';
      break;
    case 'cpc':
      valueClause = 'SUM(spend) / NULLIF(SUM(clicks), 0) AS value';
      break;
    case 'reach':
      valueClause = 'SUM(reach) AS value';
      break;
    default:
      valueClause = `SUM(${metric}) AS value`;
  }

  return `
    SELECT
      date,
      ${valueClause}
    FROM GOLD_CAMPAIGN_DAILY
    ${whereClause}
    GROUP BY date
    ORDER BY date ASC
  `;
}

/**
 * Bar Chart Query - Returns grouped data with optional sorting and limiting
 */
function buildBarChartQuery(widget: WidgetSpec, whereClause: string, params: Record<string, any>): string {
  const metric = widget.metric || 'spend';
  const groupBy = widget.group_by || 'campaign_name';

  let valueClause = '';

  switch (metric) {
    case 'spend':
      valueClause = 'SUM(spend) AS value';
      break;
    case 'impressions':
      valueClause = 'SUM(impressions) AS value';
      break;
    case 'clicks':
      valueClause = 'SUM(clicks) AS value';
      break;
    case 'ctr':
      valueClause = '(SUM(clicks) * 1.0 / NULLIF(SUM(impressions), 0)) * 100 AS value';
      break;
    case 'cpc':
      valueClause = 'SUM(spend) / NULLIF(SUM(clicks), 0) AS value';
      break;
    case 'reach':
      valueClause = 'SUM(reach) AS value';
      break;
    default:
      valueClause = `SUM(${metric}) AS value`;
  }

  let sql = `
    SELECT
      ${groupBy} AS name,
      ${valueClause}
    FROM GOLD_CAMPAIGN_DAILY
    ${whereClause}
    GROUP BY ${groupBy}
  `;

  // Add sorting
  if (widget.sort) {
    sql += ` ORDER BY value ${widget.sort}`;
  } else {
    sql += ' ORDER BY value DESC';
  }

  // Add limit if specified
  if (widget.limit && widget.limit > 0) {
    sql += ` OFFSET 0 ROWS FETCH NEXT ${widget.limit} ROWS ONLY`;
  }

  return sql;
}

/**
 * Table Query - Returns detailed campaign performance data
 */
function buildTableQuery(widget: WidgetSpec, whereClause: string, params: Record<string, any>): string {
  let sql = `
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
    ${whereClause}
    GROUP BY campaign_name
  `;

  // Add sorting
  if (widget.sort) {
    sql += ` ORDER BY total_spend ${widget.sort}`;
  } else {
    sql += ' ORDER BY total_spend DESC';
  }

  return sql;
}

export default widgetSpecToSql;