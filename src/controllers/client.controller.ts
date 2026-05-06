import { Request, Response } from 'express';
import prisma from '../config/database';

export class ClientController {
  async getAll(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      
      // Fetch clients for the user's tenant
      // For prototype: If no user is present, we could optionally return all clients
      // but let's maintain the auth structure:
      const clients = await prisma.client.findMany({
        where: userId ? { tenant: { userId } } : {},
        include: {
          campaigns: true,
          dashboards: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      res.json(clients);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch clients' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const id = req.params.id as string;
      
      const client = await prisma.client.findFirst({
        where: userId ? { id, tenant: { userId } } : { id },
        include: {
          campaigns: true,
          dashboards: true,
        },
      });

      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      res.json(client);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch client' });
    }
  }
}

export default new ClientController();
