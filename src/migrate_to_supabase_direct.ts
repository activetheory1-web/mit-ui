import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

// Use the resolved IP to bypass DNS issues
const DATABASE_URL = "postgresql://postgres.zasxbtlkvpzlkezzwvqy:BRJLS6r2qjV8GW7w@44.216.29.125:6543/postgres?pgbouncer=true";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
});

async function main() {
  console.log('🚀 Attempting to connect to Supabase via direct IP...');
  
  try {
    // 1. Create default user
    const user = await prisma.user.upsert({
      where: { email: 'admin@marketiq.com' },
      update: {},
      create: {
        email: 'admin@marketiq.com',
        password: 'hashedpassword123',
        name: 'Admin User',
      },
    });
    console.log('✅ Admin user ready:', user.email);

    // 2. Create default tenant
    const tenant = await prisma.tenant.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        name: 'Default Tenant',
        userId: user.id,
      },
    });
    console.log('✅ Default tenant ready:', tenant.name);

    console.log('🎉 Supabase setup resolved successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
