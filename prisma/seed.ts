import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import csvParser from 'csv-parser';

const prisma = new PrismaClient();

async function parseCSV(filePath: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

async function main() {
  console.log("Starting database seed from CSV files...");
  
  // 1. Ensure User & Tenant exist for Client relation
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: "admin@marketiq.com",
        password: "hashedpassword123",
        name: "Admin User"
      }
    });
    console.log("Created dummy admin user.");
  }

  let tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: "Default Tenant",
        userId: user.id
      }
    });
    console.log("Created default tenant.");
  }

  // Construct absolute paths to the CSV files in the frontend directory
  const clientsPath = path.join(__dirname, '../../frontend/data/clients.csv');
  const campaignsPath = path.join(__dirname, '../../frontend/data/campaigns.csv');
  const dashboardsPath = path.join(__dirname, '../../frontend/data/dashboards.csv');

  if (!fs.existsSync(clientsPath)) throw new Error(`Could not find ${clientsPath}`);
  
  // Read data
  console.log("Reading CSVs...");
  const clientsData = await parseCSV(clientsPath);
  const campaignsData = await parseCSV(campaignsPath);
  const dashboardsData = await parseCSV(dashboardsPath);

  console.log(`Parsed: ${clientsData.length} clients, ${campaignsData.length} campaigns, ${dashboardsData.length} dashboards.`);

  // Clean existing tables (optional, but good for idempotent seeding)
  await prisma.dashboard.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.client.deleteMany();
  console.log("Cleared existing records.");

  // Insert Clients
  for (const c of clientsData) {
    await prisma.client.create({
      data: {
        id: c.id,
        name: c.name,
        industry: c.industry,
        tenantId: tenant.id,
        platforms: c.platforms ? c.platforms.replace(/[\[\]]/g, '').split(',').map((p:string) => p.trim()) : [],
        avatar: c.avatar,
        color: c.color,
        dotColor: c.dotColor,
        lightBg: c.lightBg,
        lightBorder: c.lightBorder,
        textColor: c.textColor,
        monthlyBudget: c.monthlyBudget ? parseFloat(c.monthlyBudget) : null,
        accountManager: c.accountManager,
        status: c.status,
        iconType: c.iconType,
        retainer: c.retainer ? parseFloat(c.retainer) : null,
        since: c.since
      }
    });
  }
  console.log("Clients seeded successfully.");

  // Insert Campaigns
  for (const c of campaignsData) {
    await prisma.campaign.create({
      data: {
        id: c.id,
        clientId: c.clientId,
        name: c.name,
        channel: c.channel,
        spend: parseFloat(c.spend || '0'),
        budget: parseFloat(c.budget || '0'),
        roas: parseFloat(c.roas || '0'),
        ctr: parseFloat(c.ctr || '0'),
        cpc: parseFloat(c.cpc || '0'),
        conv: parseInt(c.conv || '0', 10),
        status: c.status,
        change: parseFloat(c.change || '0'),
        impressions: parseInt(c.impressions || '0', 10),
        clicks: parseInt(c.clicks || '0', 10),
        frequency: parseFloat(c.frequency || '0'),
        active: c.active === 'true' || c.active === '1' || c.active === 'TRUE'
      }
    });
  }
  console.log("Campaigns seeded successfully.");

  // Insert Dashboards
  for (const d of dashboardsData) {
    await prisma.dashboard.create({
      data: {
        id: d.id,
        clientId: d.clientId,
        name: d.name,
        description: d.description,
        widgets: parseInt(d.widgets || '0', 10),
        updated: d.updated ? new Date(d.updated) : new Date(),
        schedule: d.schedule,
        recipients: parseInt(d.recipients || '0', 10),
        favorite: d.favorite === 'true' || d.favorite === 'TRUE' || d.favorite === '1',
        color: d.color
      }
    });
  }
  console.log("Dashboards seeded successfully.");

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });