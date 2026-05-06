import { Request, Response } from 'express';
import prisma from '../config/database';

export class ClientController {
  async getAll(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      
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

  async create(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { name, industry } = req.body;

      const tenant = await prisma.tenant.findFirst({
        where: { userId },
      });

      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      const client = await prisma.client.create({
        data: {
          name,
          industry,
          tenantId: tenant.id,
        },
      });

      res.status(201).json(client);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create client' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;
      const { name, industry } = req.body;

      const existing = await prisma.client.findFirst({
        where: { id, tenant: { userId } },
      });

      if (!existing) {
        return res.status(404).json({ error: 'Client not found' });
      }

      const client = await prisma.client.update({
        where: { id },
        data: { name, industry },
      });

      res.json(client);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update client' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;

      const existing = await prisma.client.findFirst({
        where: { id, tenant: { userId } },
      });

      if (!existing) {
        return res.status(404).json({ error: 'Client not found' });
      }

      await prisma.client.delete({
        where: { id },
      });

      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete client' });
    }
  }
}

export default new ClientController();
