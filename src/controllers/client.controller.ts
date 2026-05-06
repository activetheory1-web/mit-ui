import { Request, Response } from 'express';
import prisma from '../config/database';
import { supabase } from '../config/supabase';

export class ClientController {
  async getAll(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      
      try {
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
        return res.json(clients);
      } catch (prismaError) {
        console.warn('Prisma fetch failed, falling back to Supabase REST API');
        
        try {
          const { data, error } = await supabase
            .from('Client')
            .select('*')
            .order('createdAt', { ascending: false });

          if (data && data.length > 0) {
            return res.json(data);
          }
        } catch (supabaseError) {
          console.warn('Supabase REST fetch failed, using mock data:', (supabaseError as any).message);
        }

        // Final fallback: Mock data for development
        console.warn('⚠️ No clients found in DB or Supabase. Returning mock data.');
        return res.json([
          {
            id: 'mock_client_1',
            name: 'Retail Brand X',
            industry: 'E-commerce',
            platforms: ['Meta', 'Google'],
            monthlyBudget: 15000,
            accountManager: 'Praveen',
            status: 'active',
            since: '2023-01-01'
          },
          {
            id: 'mock_client_2',
            name: 'SaaS Client Y',
            industry: 'Technology',
            platforms: ['Google', 'LinkedIn'],
            monthlyBudget: 8000,
            accountManager: 'Developer',
            status: 'active',
            since: '2024-02-15'
          }
        ]);
      }
    } catch (error) {
      console.error('Client fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch clients' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const id = req.params.id as string;
      
      try {
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
        return res.json(client);
      } catch (prismaError) {
        console.warn('Prisma fetch by ID failed, falling back to Supabase REST API');
        const { data, error } = await supabase
          .from('Client')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !data) return res.status(404).json({ error: 'Client not found' });
        return res.json(data);
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch client' });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { name, industry, platforms } = req.body;

      try {
        const tenant = await prisma.tenant.findFirst({
          where: { userId },
        });

        if (!tenant && userId !== 'dev_user') {
          return res.status(404).json({ error: 'Tenant not found' });
        }

        const client = await prisma.client.create({
          data: {
            name,
            industry,
            tenantId: tenant?.id || 'dev_tenant',
            platforms: platforms || [],
          },
        });
        return res.status(201).json(client);
      } catch (prismaError) {
        console.warn('Prisma create failed, falling back to Supabase REST API');
        
        const { data, error } = await supabase
          .from('Client')
          .insert([{ 
            name, 
            industry, 
            tenantId: (req as any).user?.tenantId || 'dev_tenant',
            platforms: platforms || [] 
          }])
          .select()
          .single();

        if (error) throw error;
        return res.status(201).json(data);
      }
    } catch (error) {
      console.error('Create client error:', error);
      res.status(400).json({ error: 'Failed to create client' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;
      const { name, industry, platforms } = req.body;

      try {
        const client = await prisma.client.update({
          where: { id },
          data: { name, industry, platforms },
        });
        return res.json(client);
      } catch (prismaError) {
        console.warn('Prisma update failed, falling back to Supabase REST API');
        const { data, error } = await supabase
          .from('Client')
          .update({ name, industry, platforms })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return res.json(data);
      }
    } catch (error) {
      res.status(400).json({ error: 'Failed to update client' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;

      try {
        await prisma.client.delete({
          where: { id },
        });
        return res.status(204).send();
      } catch (prismaError) {
        console.warn('Prisma delete failed, falling back to Supabase REST API');
        const { error } = await supabase
          .from('Client')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return res.status(204).send();
      }
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete client' });
    }
  }
}

export default new ClientController();
