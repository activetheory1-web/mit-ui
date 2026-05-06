import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'admin@marketiq.com' }
  });

  if (!user) {
    console.error('Admin user not found');
    process.exit(1);
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
  console.log('USER_ID:', user.id);
  console.log('TOKEN:', token);
  
  const clients = await prisma.client.findMany({
    where: { tenant: { userId: user.id } }
  });
  console.log('CLIENT_COUNT:', clients.length);
  console.log('CLIENTS:', JSON.stringify(clients, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
