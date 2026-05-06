import fs from 'fs';
import path from 'path';
import prisma from '../../config/database';

/**
 * Executes a widget query against the local PostgreSQL database (via Prisma)
 * or falls back to CSV files if the DB is empty.
 */
export async function executeWidgetQueryLocal(widget: any, clientId?: string): Promise<any[]> {
  try {
    const nameFilter = widget.campaign_name || widget.name || null;
    
    const baseWhere: any = clientId ? { clientId } : {};
    if (nameFilter) {
      baseWhere.name = { contains: nameFilter, mode: 'insensitive' };
    }

    // 1. Query MetaCampaigns
    let metaCampaigns: any[] = [];
    let googleCampaigns: any[] = [];
    let generalCampaigns: any[] = [];

    try {
      metaCampaigns = await prisma.metaCampaign.findMany({
        where: baseWhere,
        include: { connection: true },
      });

      googleCampaigns = await prisma.googleCampaign.findMany({
        where: baseWhere,
        include: { connection: true },
      });

      generalCampaigns = await prisma.campaign.findMany({
        where: baseWhere,
      });
    } catch (dbError) {
      console.warn('Database access failed, will attempt CSV fallback:', dbError instanceof Error ? dbError.message : 'Unknown error');
      // Continue to CSV fallback logic below
    }

    // 3. CSV FALLBACK: If DB is empty or failed, try reading from frontend/data/campaigns.csv
    if (metaCampaigns.length === 0 && googleCampaigns.length === 0 && generalCampaigns.length === 0) {
      const csvPath = path.resolve(process.cwd(), '../frontend/data/campaigns.csv');
      console.log('Attempting CSV fallback at:', csvPath);
      
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
          
          // Filter CSV by name if requested
          let filteredRows = rows;
          if (nameFilter) {
            filteredRows = rows.filter(r => r.name?.toLowerCase().includes(nameFilter.toLowerCase()));
          }

          // Map CSV rows to the expected shape
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
    }

    // 3. Normalize DB data if available
    const normalizedMeta = metaCampaigns.map(c => ({
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
      date: c.syncedAt,
    }));

    const normalizedGoogle = googleCampaigns.map(c => ({
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
      date: c.syncedAt,
    }));

    const normalizedGeneral = generalCampaigns.map(c => ({
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
      socialSpend: Number(c.socialSpend || 0),
      costPerUniqueClick: Number(c.costPerUniqueClick || 0),
      conv: Number(c.conv || 0),
      roas: 0,
      date: c.createdAt,
    }));

    // 4. Combine all campaigns
    let allCampaigns = [...normalizedMeta, ...normalizedGoogle, ...normalizedGeneral];

    // 5. Apply source filter if requested by the AI
    if (widget.source_filter && widget.source_filter !== 'both') {
      allCampaigns = allCampaigns.filter(c => c.source === widget.source_filter);
    }

    return allCampaigns;
  } catch (error) {
    console.error('Local Query Global Error:', error);
    return [];
  }
}
