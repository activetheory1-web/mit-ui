import { Request, Response } from 'express';
import prisma from '../config/database';
import { supabase } from '../config/supabase';

export class CampaignController {
  async getAll(req: Request, res: Response) {
    try {
      try {
        const campaigns = await prisma.campaign.findMany({
          include: {
            client: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });
        return res.json(campaigns);
      } catch (prismaError) {
        console.warn('Prisma fetch campaigns failed, falling back to Supabase REST API');
        
        try {
          const { data, error } = await supabase
            .from('Campaign')
            .select('*')
            .order('createdAt', { ascending: false });

          if (data) {
            return res.json(data);
          }
        } catch (supabaseError) {
          console.error('Database and Supabase fetch failed:', (supabaseError as any).message);
          return res.status(503).json({ error: 'Data service unavailable' });
        }

        return res.json([]);
      }
    } catch (error) {
      console.error('Campaign fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      
      try {
        const campaign = await prisma.campaign.findFirst({
          where: { id },
          include: {
            client: true,
          },
        });

        if (!campaign) {
          return res.status(404).json({ error: 'Campaign not found' });
        }
        return res.json(campaign);
      } catch (prismaError) {
        console.warn('Prisma fetch campaign by ID failed, falling back to Supabase REST API');
        const { data, error } = await supabase
          .from('Campaign')
          .select('*, Client(*)')
          .eq('id', id)
          .single();

        if (error || !data) return res.status(404).json({ error: 'Campaign not found' });
        return res.json(data);
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch campaign' });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const data = req.body;

      try {
        const campaign = await prisma.campaign.create({
          data,
          include: {
            client: true,
          },
        });
        return res.status(201).json(campaign);
      } catch (prismaError) {
        console.warn('Prisma create campaign failed, falling back to Supabase REST API');
        
        const { data: campaign, error } = await supabase
          .from('Campaign')
          .insert([data])
          .select('*, Client(*)')
          .single();

        if (error) throw error;
        return res.status(201).json(campaign);
      }
    } catch (error) {
      console.error('Create campaign error:', error);
      res.status(400).json({ error: 'Failed to create campaign' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const data = req.body;

      try {
        const campaign = await prisma.campaign.update({
          where: { id },
          data,
          include: {
            client: true,
          },
        });
        return res.json(campaign);
      } catch (prismaError) {
        console.warn('Prisma update campaign failed, falling back to Supabase REST API');
        const { data: campaign, error } = await supabase
          .from('Campaign')
          .update(data)
          .eq('id', id)
          .select('*, Client(*)')
          .single();

        if (error) throw error;
        return res.json(campaign);
      }
    } catch (error) {
      res.status(400).json({ error: 'Failed to update campaign' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = req.params.id as string;

      try {
        await prisma.campaign.delete({
          where: { id },
        });
        return res.status(204).send();
      } catch (prismaError) {
        console.warn('Prisma delete campaign failed, falling back to Supabase REST API');
        const { error } = await supabase
          .from('Campaign')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return res.status(204).send();
      }
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete campaign' });
    }
  }
}


export default new CampaignController();
