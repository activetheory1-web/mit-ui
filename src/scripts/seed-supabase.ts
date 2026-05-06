import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

const prisma = new PrismaClient();

async function readCSV(filePath: string): Promise<any[]> {
  const results: any[] = [];
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      return resolve([]);
    }
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
}

async function main() {
  console.log('🚀 Starting CSV to Supabase Migration...');

  const dataDir = path.join(__dirname, '../../../frontend/data');
  
  const clients = await readCSV(path.join(dataDir, 'clients.csv'));
  const campaigns = await readCSV(path.join(dataDir, 'campaigns.csv'));
  const dashboards = await readCSV(path.join(dataDir, 'dashboards.csv'));

  // 1. Create a primary user and tenant (required for relations)
  const user = await prisma.user.upsert({
    where: { email: 'admin@marketiq.com' },
    update: {},
    create: {
      email: 'admin@marketiq.com',
      password: 'change_me_immediately', 
      name: 'Admin User',
    },
  });

  const tenant = await prisma.tenant.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      name: 'MarketIQ Agency',
      userId: user.id,
    },
  });

  console.log(`✅ User and Tenant initialized: ${tenant.name}`);

  if (clients.length === 0 && campaigns.length === 0 && dashboards.length === 0) {
    console.log('⚠️ No data found in CSV files. Skipping data migration, but User/Tenant are ready.');
    return;
  }

  // 2. Migrate Clients
  for (const row of clients) {
    await prisma.client.upsert({
      where: { id: row.id },
      update: {
        ...row,
        monthlyBudget: parseFloat(row.monthlyBudget) || 0,
        platforms: row.platforms ? row.platforms.split(',').map((p: string) => p.trim()) : [],
        retainer: row.retainer,
        since: row.since,
      },
      create: {
        ...row,
        tenantId: tenant.id,
        monthlyBudget: parseFloat(row.monthlyBudget) || 0,
        platforms: row.platforms ? row.platforms.split(',').map((p: string) => p.trim()) : [],
      },
    });
  }
  console.log(`✅ Migrated ${clients.length} clients.`);

  // 3. Migrate Campaigns
  for (const row of campaigns) {
    await prisma.campaign.upsert({
      where: { id: row.id },
      update: {
        ...row,
        spend: parseFloat(row.spend) || 0,
        budget: parseFloat(row.budget) || 0,
        roas: parseFloat(row.roas) || 0,
        ctr: parseFloat(row.ctr) || 0,
        cpc: parseFloat(row.cpc) || 0,
        conv: parseInt(row.conv) || 0,
        change: parseFloat(row.change) || 0,
        impressions: parseInt(row.impressions) || 0,
        clicks: parseInt(row.clicks) || 0,
        frequency: parseFloat(row.frequency) || 0,
        active: row.active === 'true',
      },
      create: {
        ...row,
        spend: parseFloat(row.spend) || 0,
        budget: parseFloat(row.budget) || 0,
        roas: parseFloat(row.roas) || 0,
        ctr: parseFloat(row.ctr) || 0,
        cpc: parseFloat(row.cpc) || 0,
        conv: parseInt(row.conv) || 0,
        change: parseFloat(row.change) || 0,
        impressions: parseInt(row.impressions) || 0,
        clicks: parseInt(row.clicks) || 0,
        frequency: parseFloat(row.frequency) || 0,
        active: row.active === 'true',
      },
    });
  }
  console.log(`✅ Migrated ${campaigns.length} campaigns.`);

  // 4. Migrate Dashboards
  for (const row of dashboards) {
    await prisma.dashboard.upsert({
      where: { id: row.id },
      update: {
        ...row,
        widgets: parseInt(row.widgets) || 0,
        recipients: parseInt(row.recipients) || 0,
        favorite: row.favorite === 'true',
        updated: new Date(),
      },
      create: {
        ...row,
        widgets: parseInt(row.widgets) || 0,
        recipients: parseInt(row.recipients) || 0,
        favorite: row.favorite === 'true',
        updated: new Date(),
      },
    });
  }
  console.log(`✅ Migrated ${dashboards.length} dashboards.`);

  console.log('🎉 Migration completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
