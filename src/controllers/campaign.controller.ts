import { Request, Response } from 'express';
import prisma from '../config/database';

export class CampaignController {
  async getAll(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const campaigns = await prisma.campaign.findMany({
        where: { client: { tenant: { userId } } },
        include: {
          client: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;
      const campaign = await prisma.campaign.findFirst({
        where: { id, client: { tenant: { userId } } },
        include: {
          client: true,
        },
      });

      if (!campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      res.json(campaign);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch campaign' });
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

      const campaign = await prisma.campaign.create({
        data,
        include: {
          client: true,
        },
      });
      res.status(201).json(campaign);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create campaign' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;
      const data = req.body;

      // Verify campaign ownership
      const existing = await prisma.campaign.findFirst({
        where: { id, client: { tenant: { userId } } },
      });
      if (!existing) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      const campaign = await prisma.campaign.update({
        where: { id },
        data,
        include: {
          client: true,
        },
      });

      res.json(campaign);
    } catch (error) {
      res.status(400).json({ error: 'Failed to update campaign' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;

      // Verify campaign ownership
      const existing = await prisma.campaign.findFirst({
        where: { id, client: { tenant: { userId } } },
      });
      if (!existing) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      await prisma.campaign.delete({
        where: { id },
      });
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete campaign' });
    }
  }
}

export default new CampaignController();
