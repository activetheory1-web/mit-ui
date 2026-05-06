import { Request, Response } from 'express';
import prisma from '../config/database';

export class DashboardController {
  async getAll(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      // For prototype: allow fetching without auth
      let clientIds: string[] | undefined = undefined;
      
      if (userId) {
        const tenant = await prisma.tenant.findUnique({
          where: { userId },
          include: { clients: true },
        });
        clientIds = tenant?.clients.map(c => c.id) || [];
      }

      const dashboards = await prisma.dashboard.findMany({
        where: clientIds ? { clientId: { in: clientIds } } : {},
        orderBy: {
          createdAt: 'desc',
        },
      });
      res.json(dashboards);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch dashboards' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const tenant = await prisma.tenant.findUnique({
        where: { userId },
        include: { clients: true },
      });
      const clientIds = tenant?.clients.map(c => c.id) || [];

      const id = req.params.id as string;
      const dashboard = await prisma.dashboard.findFirst({
        where: { id, clientId: { in: clientIds } },
      });

      if (!dashboard) {
        return res.status(404).json({ error: 'Dashboard not found' });
      }

      res.json(dashboard);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch dashboard' });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const data = req.body;

      // Verify client ownership
      const client = await prisma.client.findFirst({
        where: { id: data.clientId, tenant: { userId } },
      });
      if (!client) {
        return res.status(403).json({ error: 'Forbidden: Client does not belong to user' });
      }

      const dashboard = await prisma.dashboard.create({
        data,
      });
      res.status(201).json(dashboard);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create dashboard' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const tenant = await prisma.tenant.findUnique({
        where: { userId },
        include: { clients: true },
      });
      const clientIds = tenant?.clients.map(c => c.id) || [];

      const id = req.params.id as string;
      const data = req.body;

      // Verify dashboard ownership
      const existing = await prisma.dashboard.findFirst({
        where: { id, clientId: { in: clientIds } },
      });
      if (!existing) {
        return res.status(404).json({ error: 'Dashboard not found' });
      }

      const dashboard = await prisma.dashboard.update({
        where: { id },
        data,
      });

      res.json(dashboard);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update dashboard' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const tenant = await prisma.tenant.findUnique({
        where: { userId },
        include: { clients: true },
      });
      const clientIds = tenant?.clients.map(c => c.id) || [];

      const id = req.params.id as string;

      // Verify dashboard ownership
      const existing = await prisma.dashboard.findFirst({
        where: { id, clientId: { in: clientIds } },
      });
      if (!existing) {
        return res.status(404).json({ error: 'Dashboard not found' });
      }

      await prisma.dashboard.delete({
        where: { id },
      });
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete dashboard' });
    }
  }
}

export default new DashboardController();
