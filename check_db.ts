import prisma from './src/config/database';

async function checkData() {
  try {
    const clients = await prisma.client.findMany();
    console.log('--- CLIENTS ---');
    clients.forEach(c => console.log(`ID: ${c.id}, Name: ${c.name}`));

    const metaCampaigns = await prisma.metaCampaign.findMany();
    console.log('\n--- META CAMPAIGNS ---');
    console.log(`Total: ${metaCampaigns.length}`);
    metaCampaigns.slice(0, 5).forEach(c => {
      console.log(`Campaign: ${c.name}, ClientID: ${c.clientId}`);
    });

    const googleCampaigns = await prisma.googleCampaign.findMany();
    console.log('\n--- GOOGLE CAMPAIGNS ---');
    console.log(`Total: ${googleCampaigns.length}`);
    googleCampaigns.slice(0, 5).forEach(c => {
      console.log(`Campaign: ${c.name}, ClientID: ${c.clientId}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
