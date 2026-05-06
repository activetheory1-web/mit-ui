import fs from 'fs';
import path from 'path';
import prisma from '../../config/database';
import { supabase } from '../../config/supabase';

/**
 * Executes a widget query against the local PostgreSQL database (via Prisma)
 * or falls back to Supabase REST API, and finally to CSV files.
 */
export async function executeWidgetQueryLocal(widget: any, clientId?: string): Promise<any[]> {
  try {
    const nameFilter = widget.campaign_name || widget.name || null;
    const baseWhere: any = clientId ? { clientId } : {};
    
    // 1. Try Prisma first
    try {
      const [metaCampaigns, googleCampaigns, generalCampaigns] = await Promise.all([
        prisma.metaCampaign.findMany({ where: baseWhere, include: { connection: true } }),
        prisma.googleCampaign.findMany({ where: baseWhere, include: { connection: true } }),
        prisma.campaign.findMany({ where: baseWhere }),
      ]);

      if (metaCampaigns.length > 0 || googleCampaigns.length > 0 || generalCampaigns.length > 0) {
        return normalizeResults(metaCampaigns, googleCampaigns, generalCampaigns, widget);
      }
    } catch (dbError) {
      console.warn('Prisma query failed, trying Supabase fallback:', (dbError as any).message);
    }

    // 2. Try Supabase REST API second
    try {
      const [metaRes, googleRes, generalRes] = await Promise.all([
        supabase.from('MetaCampaign').select('*').match(clientId ? { clientId } : {}),
        supabase.from('GoogleCampaign').select('*').match(clientId ? { clientId } : {}),
        supabase.from('Campaign').select('*').match(clientId ? { clientId } : {}),
      ]);

      if (!metaRes.error || !googleRes.error || !generalRes.error) {
        const meta = metaRes.data || [];
        const google = googleRes.data || [];
        const general = generalRes.data || [];
        
        if (meta.length > 0 || google.length > 0 || general.length > 0) {
          return normalizeResults(meta, google, general, widget);
        }
      }
    } catch (supabaseError) {
      console.warn('Supabase query failed, falling back to CSV:', (supabaseError as any).message);
    }

    // 3. Final Fallback: CSV
    const csvPath = path.resolve(process.cwd(), '../frontend/data/campaigns.csv');
    if (fs.existsSync(csvPath)) {
      const csvData = fs.readFileSync(csvPath, 'utf-8');
      const lines = csvData.trim().split('\n');
      if (lines.length > 1) {
        const headers = lines[0].split(',');
        const rows = lines.slice(1).map(line => {
          const values = line.split(',');
          const row: any = {};
          headers.forEach((header, i) => {
            row[header.trim()] = values[i]?.trim();
          });
          return row;
        });
        
        let filteredRows = rows;
        if (nameFilter) {
          filteredRows = rows.filter(r => r.name?.toLowerCase().includes(nameFilter.toLowerCase()));
        }

        return filteredRows.map(r => ({
          campaign_name: r.name,
          source: r.channel || 'Meta',
          campaign_status: r.status?.toLowerCase() || 'active',
          spend: Number(r.spend || 0),
          impressions: Number(r.impressions || 0),
          clicks: Number(r.clicks || 0),
          ctr: Number(r.ctr || 0),
          cpc: Number(r.cpc || 0),
          cpm: Number(r.spend || 0) / (Number(r.impressions || 1) / 1000),
          reach: Number(r.impressions || 0),
          uniqueClicks: Number(r.clicks || 0),
          socialSpend: r.channel === 'Meta' ? Number(r.spend || 0) : 0,
          costPerUniqueClick: Number(r.cpc || 0),
          conv: Number(r.conv || 0),
          roas: Number(r.roas || 0),
          date: new Date().toISOString()
        }));
      }
    }

    return [];
  } catch (error) {
    console.error('Local Query Global Error:', error);
    return [];
  }
}

function normalizeResults(meta: any[], google: any[], general: any[], widget: any): any[] {
  const normalizedMeta = meta.map(c => ({
    campaign_name: c.name,
    source: 'Meta',
    campaign_status: c.status?.toLowerCase() || 'unknown',
    spend: Number(c.spend || 0),
    impressions: Number(c.impressions || 0),
    clicks: Number(c.clicks || 0),
    ctr: Number(c.ctr || 0),
    cpc: Number(c.cpc || 0),
    cpm: Number(c.cpm || 0),
    reach: Number(c.reach || 0),
    uniqueClicks: Number(c.uniqueClicks || 0),
    socialSpend: Number(c.socialSpend || 0),
    costPerUniqueClick: Number(c.costPerUniqueClick || 0),
    conv: 0,
    roas: 0,
    date: c.syncedAt || c.createdAt,
  }));

  const normalizedGoogle = google.map(c => ({
    campaign_name: c.name,
    source: 'Google',
    campaign_status: c.status?.toLowerCase() || 'unknown',
    spend: Number(c.spend || 0),
    impressions: Number(c.impressions || 0),
    clicks: Number(c.clicks || 0),
    ctr: Number(c.ctr || 0),
    cpc: Number(c.cpc || 0),
    cpm: Number(c.cpm || 0),
    reach: Number(c.reach || 0),
    uniqueClicks: Number(c.uniqueClicks || 0),
    socialSpend: 0,
    costPerUniqueClick: Number(c.cpc || 0),
    conv: Number(c.conversions || 0),
    roas: 0,
    date: c.syncedAt || c.createdAt,
  }));

  const normalizedGeneral = general.map(c => ({
    campaign_name: c.name,
    source: 'General', 
    campaign_status: c.status?.toLowerCase() || 'unknown',
    spend: Number(c.spend || 0),
    impressions: Number(c.impressions || 0),
    clicks: Number(c.clicks || 0),
    ctr: Number(c.ctr || 0),
    cpc: Number(c.cpc || 0),
    cpm: Number(c.cpm || 0),
    reach: Number(c.reach || 0),
    uniqueClicks: Number(c.uniqueClicks || 0),
    socialSpend: Number(c.socialSpend || 0),
    costPerUniqueClick: Number(c.costPerUniqueClick || 0),
    conv: Number(c.conv || 0),
    roas: 0,
    date: c.createdAt,
  }));

  let all = [...normalizedMeta, ...normalizedGoogle, ...normalizedGeneral];
  if (widget.source_filter && widget.source_filter !== 'both') {
    all = all.filter(c => c.source.toLowerCase() === widget.source_filter.toLowerCase());
  }
  return all;
}
