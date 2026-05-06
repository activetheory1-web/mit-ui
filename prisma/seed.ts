import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create a test user
  const hashedPassword = await bcrypt.hash('password123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      password: hashedPassword,
      name: 'Test User'
    }
  });

  console.log('Created user:', user.email);

  // Create a tenant for the user
  const tenant = await prisma.tenant.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      name: 'Active Theory Solutions',
      userId: user.id
    }
  });

  console.log('Created tenant:', tenant.name);

  // Create sample clients
  const clients = await Promise.all([
    prisma.client.upsert({
      where: { id: 'client-1' },
      update: {},
      create: {
        id: 'client-1',
        name: 'Nova Sportswear',
        industry: 'Ecommerce',
        tenantId: tenant.id,
        platforms: ['Meta', 'Google']
      }
    }),
    prisma.client.upsert({
      where: { id: 'client-2' },
      update: {},
      create: {
        id: 'client-2',
        name: 'FinEdge Capital',
        industry: 'Fintech',
        tenantId: tenant.id,
        platforms: ['Google', 'LinkedIn']
      }
    }),
    prisma.client.upsert({
      where: { id: 'client-3' },
      update: {},
      create: {
        id: 'client-3',
        name: 'BloomBox',
        industry: 'Ecommerce',
        tenantId: tenant.id,
        platforms: ['Meta', 'TikTok']
      }
    }),
    prisma.client.upsert({
      where: { id: 'client-4' },
      update: {},
      create: {
        id: 'client-4',
        name: 'Orbit SaaS',
        industry: 'Technology',
        tenantId: tenant.id,
        platforms: ['Meta', 'Google', 'LinkedIn']
      }
    })
  ]);

  console.log(`Created ${clients.length} clients`);

  // Create sample campaigns
  const campaigns = await Promise.all([
    prisma.campaign.upsert({
      where: { id: 'campaign-1' },
      update: {},
      create: {
        id: 'campaign-1',
        name: 'Summer Sale 2024',
        clientId: clients[0].id,
        channel: 'Meta',
        spend: 12430.50,
        budget: 15000,
        roas: 3.2,
        ctr: 2.4,
        cpc: 0.51,
        conv: 245,
        status: 'healthy',
        change: 12.5,
        impressions: 245000,
        clicks: 24310,
        frequency: 2.1,
        active: true
      }
    }),
    prisma.campaign.upsert({
      where: { id: 'campaign-2' },
      update: {},
      create: {
        id: 'campaign-2',
        name: 'Brand Awareness',
        clientId: clients[0].id,
        channel: 'Google',
        spend: 8750.25,
        budget: 10000,
        roas: 2.8,
        ctr: 1.8,
        cpc: 0.87,
        conv: 156,
        status: 'healthy',
        change: 8.3,
        impressions: 189000,
        clicks: 10056,
        frequency: 1.8,
        active: true
      }
    }),
    prisma.campaign.upsert({
      where: { id: 'campaign-3' },
      update: {},
      create: {
        id: 'campaign-3',
        name: 'Retargeting Q1',
        clientId: clients[1].id,
        channel: 'Google',
        spend: 5420.00,
        budget: 6000,
        roas: 4.1,
        ctr: 3.2,
        cpc: 0.42,
        conv: 129,
        status: 'healthy',
        change: 15.7,
        impressions: 89000,
        clicks: 12900,
        frequency: 3.5,
        active: true
      }
    }),
    prisma.campaign.upsert({
      where: { id: 'campaign-4' },
      update: {},
      create: {
        id: 'campaign-4',
        name: 'Lead Gen Campaign',
        clientId: clients[1].id,
        channel: 'LinkedIn',
        spend: 3200.75,
        budget: 4000,
        roas: 2.5,
        ctr: 1.5,
        cpc: 1.25,
        conv: 64,
        status: 'warning',
        change: -5.2,
        impressions: 45000,
        clicks: 2560,
        frequency: 1.2,
        active: true
      }
    }),
    prisma.campaign.upsert({
      where: { id: 'campaign-5' },
      update: {},
      create: {
        id: 'campaign-5',
        name: 'Spring Collection',
        clientId: clients[2].id,
        channel: 'Meta',
        spend: 9800.00,
        budget: 12000,
        roas: 2.9,
        ctr: 2.1,
        cpc: 0.48,
        conv: 204,
        status: 'healthy',
        change: 10.8,
        impressions: 204000,
        clicks: 20400,
        frequency: 2.4,
        active: true
      }
    }),
    prisma.campaign.upsert({
      where: { id: 'campaign-6' },
      update: {},
      create: {
        id: 'campaign-6',
        name: 'TikTok Viral',
        clientId: clients[2].id,
        channel: 'TikTok',
        spend: 4500.50,
        budget: 5000,
        roas: 3.5,
        ctr: 2.8,
        cpc: 0.35,
        conv: 128,
        status: 'healthy',
        change: 22.4,
        impressions: 128000,
        clicks: 12857,
        frequency: 4.2,
        active: true
      }
    }),
    prisma.campaign.upsert({
      where: { id: 'campaign-7' },
      update: {},
      create: {
        id: 'campaign-7',
        name: 'B2B Outreach',
        clientId: clients[3].id,
        channel: 'LinkedIn',
        spend: 6750.25,
        budget: 8000,
        roas: 3.8,
        ctr: 2.5,
        cpc: 0.95,
        conv: 142,
        status: 'healthy',
        change: 18.2,
        impressions: 71000,
        clicks: 7105,
        frequency: 2.8,
        active: true
      }
    }),
    prisma.campaign.upsert({
      where: { id: 'campaign-8' },
      update: {},
      create: {
        id: 'campaign-8',
        name: 'Product Launch',
        clientId: clients[3].id,
        channel: 'Meta',
        spend: 11200.00,
        budget: 15000,
        roas: 2.6,
        ctr: 1.9,
        cpc: 0.62,
        conv: 180,
        status: 'warning',
        change: -2.5,
        impressions: 180000,
        clicks: 18058,
        frequency: 2.0,
        active: true
      }
    }),
    prisma.campaign.upsert({
      where: { id: 'campaign-9' },
      update: {},
      create: {
        id: 'campaign-9',
        name: 'Search Campaign',
        clientId: clients[3].id,
        channel: 'Google',
        spend: 8900.75,
        budget: 10000,
        roas: 4.2,
        ctr: 3.5,
        cpc: 0.38,
        conv: 234,
        status: 'healthy',
        change: 25.6,
        impressions: 234000,
        clicks: 23421,
        frequency: 3.8,
        active: true
      }
    }),
    prisma.campaign.upsert({
      where: { id: 'campaign-10' },
      update: {},
      create: {
        id: 'campaign-10',
        name: 'Holiday Special',
        clientId: clients[0].id,
        channel: 'Meta',
        spend: 15600.00,
        budget: 20000,
        roas: 3.0,
        ctr: 2.2,
        cpc: 0.55,
        conv: 283,
        status: 'critical',
        change: -8.7,
        impressions: 283000,
        clicks: 28364,
        frequency: 2.6,
        active: false
      }
    })
  ]);

  console.log(`Created ${campaigns.length} campaigns`);

  // Create sample dashboards
  const dashboards = await Promise.all([
    prisma.dashboard.upsert({
      where: { id: 'dashboard-1' },
      update: {},
      create: {
        id: 'dashboard-1',
        name: 'Performance Overview',
        description: 'Overall campaign performance metrics',
        clientId: clients[0].id,
        widgets: 6,
        updated: new Date(),
        schedule: 'daily',
        recipients: 3,
        favorite: true,
        color: 'from-blue-500 to-blue-700'
      }
    }),
    prisma.dashboard.upsert({
      where: { id: 'dashboard-2' },
      update: {},
      create: {
        id: 'dashboard-2',
        name: 'ROI Analysis',
        description: 'Return on investment breakdown',
        clientId: clients[1].id,
        widgets: 4,
        updated: new Date(),
        schedule: 'weekly',
        recipients: 2,
        favorite: false,
        color: 'from-emerald-500 to-emerald-700'
      }
    }),
    prisma.dashboard.upsert({
      where: { id: 'dashboard-3' },
      update: {},
      create: {
        id: 'dashboard-3',
        name: 'Audience Insights',
        description: 'Audience demographics and behavior',
        clientId: clients[2].id,
        widgets: 5,
        updated: new Date(),
        schedule: null,
        recipients: 1,
        favorite: true,
        color: 'from-purple-500 to-purple-700'
      }
    }),
    prisma.dashboard.upsert({
      where: { id: 'dashboard-4' },
      update: {},
      create: {
        id: 'dashboard-4',
        name: 'Channel Comparison',
        description: 'Cross-platform performance comparison',
        clientId: clients[3].id,
        widgets: 8,
        updated: new Date(),
        schedule: 'daily',
        recipients: 4,
        favorite: false,
        color: 'from-orange-500 to-orange-700'
      }
    }),
    prisma.dashboard.upsert({
      where: { id: 'dashboard-5' },
      update: {},
      create: {
        id: 'dashboard-5',
        name: 'Conversion Funnel',
        description: 'Conversion tracking and analysis',
        clientId: clients[0].id,
        widgets: 3,
        updated: new Date(),
        schedule: null,
        recipients: 2,
        favorite: false,
        color: 'from-pink-500 to-pink-700'
      }
    }),
    prisma.dashboard.upsert({
      where: { id: 'dashboard-6' },
      update: {},
      create: {
        id: 'dashboard-6',
        name: 'Budget Utilization',
        description: 'Budget spend and allocation',
        clientId: clients[1].id,
        widgets: 4,
        updated: new Date(),
        schedule: 'weekly',
        recipients: 3,
        favorite: true,
        color: 'from-teal-500 to-teal-700'
      }
    }),
    prisma.dashboard.upsert({
      where: { id: 'dashboard-7' },
      update: {},
      create: {
        id: 'dashboard-7',
        name: 'Creative Performance',
        description: 'Ad creative effectiveness analysis',
        clientId: clients[2].id,
        widgets: 5,
        updated: new Date(),
        schedule: null,
        recipients: 1,
        favorite: false,
        color: 'from-indigo-500 to-indigo-700'
      }
    }),
    prisma.dashboard.upsert({
      where: { id: 'dashboard-8' },
      update: {},
      create: {
        id: 'dashboard-8',
        name: 'Geographic Report',
        description: 'Performance by region',
        clientId: clients[3].id,
        widgets: 6,
        updated: new Date(),
        schedule: 'monthly',
        recipients: 5,
        favorite: false,
        color: 'from-cyan-500 to-cyan-700'
      }
    }),
    prisma.dashboard.upsert({
      where: { id: 'dashboard-9' },
      update: {},
      create: {
        id: 'dashboard-9',
        name: 'Trend Analysis',
        description: 'Performance trends over time',
        clientId: clients[0].id,
        widgets: 4,
        updated: new Date(),
        schedule: 'daily',
        recipients: 2,
        favorite: true,
        color: 'from-rose-500 to-rose-700'
      }
    }),
    prisma.dashboard.upsert({
      where: { id: 'dashboard-10' },
      update: {},
      create: {
        id: 'dashboard-10',
        name: 'Competitor Analysis',
        description: 'Market position and comparison',
        clientId: clients[1].id,
        widgets: 3,
        updated: new Date(),
        schedule: null,
        recipients: 1,
        favorite: false,
        color: 'from-amber-500 to-amber-700'
      }
    })
  ]);

  console.log(`Created ${dashboards.length} dashboards`);

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });