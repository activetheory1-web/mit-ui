import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const metaCount = await prisma.metaCampaign.count();
  const campaignCount = await prisma.campaign.count();
  console.log('--- DB STATS ---');
  console.log('Meta Campaigns:', metaCount);
  console.log('General Campaigns:', campaignCount);
  console.log('----------------');
}

main().catch(console.error).finally(() => prisma.$disconnect());
