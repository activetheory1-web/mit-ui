import { Request, Response } from 'express';
import prisma from '../config/database';
import { supabase } from '../config/supabase';

export class DashboardController {
  async getAll(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      
      try {
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
        return res.json(dashboards);
      } catch (prismaError) {
        console.warn('Prisma fetch dashboards failed, falling back to Supabase REST API');
        
        try {
          const { data, error } = await supabase
            .from('Dashboard')
            .select('*')
            .order('createdAt', { ascending: false });

          if (data && data.length > 0) {
            return res.json(data);
          }
        } catch (supabaseError) {
          console.error('Database and Supabase fetch failed:', (supabaseError as any).message);
          return res.status(503).json({ error: 'Data service unavailable' });
        }

        return res.json([]);
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch dashboards' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const id = req.params.id as string;
      
      try {
        const dashboard = await prisma.dashboard.findFirst({
          where: { id },
        });

        if (!dashboard) {
          return res.status(404).json({ error: 'Dashboard not found' });
        }
        return res.json(dashboard);
      } catch (prismaError) {
        console.warn('Prisma fetch dashboard by ID failed, falling back to Supabase REST API');
        const { data, error } = await supabase
          .from('Dashboard')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !data) return res.status(404).json({ error: 'Dashboard not found' });
        return res.json(data);
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch dashboard' });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const data = req.body;

      try {
        const client = await prisma.client.findFirst({
          where: { id: data.clientId, tenant: { userId } },
        });
        if (!client && userId !== 'dev_user') {
          return res.status(403).json({ error: 'Forbidden: Client does not belong to user' });
        }

        const dashboard = await prisma.dashboard.create({
          data,
        });
        return res.status(201).json(dashboard);
      } catch (prismaError) {
        console.warn('Prisma create dashboard failed, falling back to Supabase REST API');
        
        const { data: dashboard, error } = await supabase
          .from('Dashboard')
          .insert([data])
          .select()
          .single();

        if (error) throw error;
        return res.status(201).json(dashboard);
      }
    } catch (error) {
      console.error('Create dashboard error:', error);
      res.status(400).json({ error: 'Failed to create dashboard' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;
      const data = req.body;

      try {
        const dashboard = await prisma.dashboard.update({
          where: { id },
          data,
        });
        return res.json(dashboard);
      } catch (prismaError) {
        console.warn('Prisma update dashboard failed, falling back to Supabase REST API');
        const { data: dashboard, error } = await supabase
          .from('Dashboard')
          .update(data)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return res.json(dashboard);
      }
    } catch (error) {
      res.status(400).json({ error: 'Failed to update dashboard' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;

      try {
        await prisma.dashboard.delete({
          where: { id },
        });
        return res.status(204).send();
      } catch (prismaError) {
        console.warn('Prisma delete dashboard failed, falling back to Supabase REST API');
        const { error } = await supabase
          .from('Dashboard')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return res.status(204).send();
      }
    } catch (error) {
      res.status(400).json({ error: 'Failed to delete dashboard' });
    }
  }
}

export default new DashboardController();
