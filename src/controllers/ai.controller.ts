import { Request, Response } from 'express';
import OpenAI from 'openai';
import prisma from '../config/database';
import { executeWidgetQueryLocal } from '../integrations/local/local.queries';
import AISnapshotService from '../services/ai.snapshot';

const openai = new OpenAI({
  apiKey:
    process.env.GROQ_API_KEY ||
    process.env.GROK_API_KEY ||
    process.env.XAI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    'dummy_key',
  baseURL: 'https://api.groq.com/openai/v1',
});

const SYSTEM_PROMPT = `
You are a professional marketing analytics assistant for an ads dashboard. 
Your goal is to provide insightful, data-driven, and professional responses to the user.

The user has campaign data in a table with these columns:
campaign_name, source (Meta/Google), campaign_status, spend, impressions, clicks, ctr, cpc, cpm, reach, uniqueClicks, socialSpend, costPerUniqueClick, date.

Return ONLY a valid JSON object - no explanation, no markdown:
{
  "summary": "A professional and conversational response. If the user greets you (e.g., 'hi'), respond with a warm, professional greeting and include a specific highlight or insight from the ACTUAL REAL DATA SNAPSHOT provided below to show you are informed. If the user asks for data/charts, explain the reasoning behind the widgets and the strategic insights found.",
  "widgets": [
    {
      "type": "bar_chart" | "kpi_card" | "table" | "pie_chart" | "funnel_chart" | "heatmap" | "scatter_plot" | "alert_card" | "text_annotation" | "insight_card",
      "title": "short descriptive title",
      "metric": "spend" | "clicks" | "impressions" | "cpc" | "ctr" | "cpm" | "roas" | "uniqueClicks" | "socialSpend" | "reach",
      "group_by": "campaign_name" | "source" | "campaign_status" | null,
      "name": "specific campaign name string to filter by if the user asks about one",
      "sort": "ASC" | "DESC",
      "limit": 5,
      "source_filter": "Meta" | "Google" | "both",
      "severity": "critical" | "warning" | "positive",
      "message": "insightful string for alert_card or insight_card based on the snapshot",
      "markdownContent": "markdown summary for text_annotation or insight_card"
    }
  ]
}

Rules:
- ALWAYS use the REAL DATA SNAPSHOT provided in the message to formulate your summary.
- If the user request is just a greeting or general inquiry, keep "widgets" as an empty array [].
- insight_card: Use this for high-value strategic recommendations or budget optimization tips.
- alert_card: Use this for critical performance warnings.
- If the user asks about a specific campaign by name, set the "name" property in the widget.
- bar_chart: comparisons between campaigns or sources
- kpi_card: single headline totals/averages
- table: detailed list of all campaigns
- pie_chart: budget or click distribution/share
- alert_card: highlighting anomalies (e.g. high CPC, low CTR)
- text_annotation: providing a strategic summary of the findings
- 'worst' = sort ASC. 'best' or 'top' = sort DESC
- Always provide data-driven titles.
- Return ONLY the JSON. No conversational text outside the JSON.
`;

export class AIController {
  async generateDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { prompt, clientId } = req.body;
      const user = (req as any).user;

      // 1. Fetch REAL DATA Context
      const snapshot = await AISnapshotService.getClientSnapshot(clientId);
      const contextualPrompt = `USER REQUEST: ${prompt}\n\n${snapshot}`;

      // 2. Call Groq API
      const response = await openai.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: contextualPrompt },
        ],
        temperature: 0,
      });

      const rawContent = response.choices[0].message.content || '';
      const cleanContent = rawContent.replace(/\`\`\`json|\`\`\`/g, '').trim();

      let spec: any;
      try {
        spec = JSON.parse(cleanContent);
      } catch (err) {
        console.error('Groq returned invalid JSON:', rawContent);
        res
          .status(500)
          .json({ error: 'Failed to generate dashboard', message: 'AI returned invalid JSON.' });
        return;
      }

      if (!spec.widgets || !Array.isArray(spec.widgets)) {
        res.status(500).json({ error: 'Invalid response from AI engine' });
        return;
      }

      // 3. Process widgets and fetch data
      const widgets = await Promise.all(
        spec.widgets.map(async (widget: any) => {
          // Query local PostgreSQL database via Prisma (free, no Fabric needed)
          const campaigns = await executeWidgetQueryLocal(widget, clientId);

          let data: any[] = [];

          if (widget.type === 'kpi_card') {
            let total = 0;
            campaigns.forEach((c: any) => {
              total += Number(c[widget.metric as keyof any] || 0);
            });

            // Handle averages for specific rate-based metrics
            if (['cpc', 'ctr', 'cpm', 'roas', 'costPerUniqueClick'].includes(widget.metric)) {
              total = campaigns.length > 0 ? total / campaigns.length : 0;
            }

            data = [{ value: total }];
          } else if (widget.type === 'bar_chart' || widget.type === 'table' || widget.type === 'pie_chart') {
            if (widget.group_by === 'campaign_name' || widget.group_by === 'name') {
              data = campaigns.map((c: any) => ({
                name: c.campaign_name,
                value: Number(c[widget.metric as keyof any] || 0),
                status: c.campaign_status,
                spend: c.spend,
                impressions: c.impressions,
                clicks: c.clicks,
                ctr: c.ctr,
                cpc: c.cpc,
                cpm: c.cpm,
                uniqueClicks: c.uniqueClicks,
                socialSpend: c.socialSpend,
              }));
            } else if (widget.group_by === 'source' || widget.group_by === 'channel') {
              const grouped: Record<string, number> = {};
              campaigns.forEach((c: any) => {
                const ch = c.source;
                grouped[ch] = (grouped[ch] || 0) + Number(c[widget.metric as keyof any] || 0);
              });
              data = Object.keys(grouped).map(k => ({ name: k, value: grouped[k] }));
            } else {
              data = campaigns.map((c: any) => ({
                name: c.campaign_name,
                value: c[widget.metric as keyof any],
                status: c.campaign_status,
                spend: c.spend,
                impressions: c.impressions,
                clicks: c.clicks,
                ctr: c.ctr,
                cpc: c.cpc,
              }));
            }

            data.sort((a, b) => {
              if (widget.sort === 'ASC') {
                return (a.value || 0) - (b.value || 0);
              } else {
                return (b.value || 0) - (a.value || 0);
              }
            });

            if (widget.limit && (widget.type === 'bar_chart' || widget.type === 'pie_chart')) {
              data = data.slice(0, widget.limit);
            }
          } else if (widget.type === 'funnel_chart') {
            data = [
              { name: 'Impressions', value: campaigns.reduce((sum: number, c: any) => sum + Number(c.impressions || 0), 0) },
              { name: 'Clicks', value: campaigns.reduce((sum: number, c: any) => sum + Number(c.clicks || 0), 0) },
              { name: 'Conversions', value: campaigns.reduce((sum: number, c: any) => sum + Number(c.conv || 0), 0) }
            ];
          } else if (widget.type === 'scatter_plot') {
            data = campaigns.map((c: any) => ({
              name: c.campaign_name,
              value: [
                Number(c[widget.metric || 'spend'] || 0),
                Number(c.roas || 0),
                Number(c.clicks || 10)
              ]
            }));
            widget.xAxisLabel = widget.metric || 'spend';
            widget.yAxisLabel = 'ROAS';
          } else if (widget.type === 'heatmap') {
            const sources = Array.from(new Set(campaigns.map((c: any) => c.source)));
            const statuses = Array.from(new Set(campaigns.map((c: any) => c.campaign_status)));
            const points: any[] = [];

            sources.forEach((src, xIdx) => {
              statuses.forEach((st, yIdx) => {
                const sum = campaigns
                  .filter((c: any) => c.source === src && c.campaign_status === st)
                  .reduce((s: number, c: any) => s + Number(c[widget.metric || 'spend'] || 0), 0);
                points.push([xIdx, yIdx, sum]);
              });
            });

            data = {
              xAxis: sources,
              yAxis: statuses,
              points
            } as any;
          }

          return { ...widget, data };
        })
      );

      const result = { 
        summary: spec.summary || "I've generated a custom dashboard based on your request.",
        widgets 
      };
      res.json(result);
    } catch (error: any) {
      console.error('--- AI ENGINE ERROR DEBUG ---');
      console.error('Error Name:', error.name);
      console.error('Error Message:', error.message);
      if (error.response) {
        console.error('API Response Status:', error.response.status);
        console.error('API Response Data:', JSON.stringify(error.response.data));
      }
      console.error('Stack Trace:', error.stack);
      console.error('-----------------------------');

      res.status(500).json({ 
        error: 'Failed to generate dashboard', 
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  }
}

export default new AIController();
