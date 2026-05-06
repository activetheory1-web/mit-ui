import { Request, Response } from 'express';
import prisma from '../config/database';
import { supabase } from '../config/supabase';

export class ClientController {
  async getAll(req: Request, res: Response) {
    try {
      // Auth disabled: fetching all clients or scoping to dev_user
      const userId = 'dev_user';
      
      try {
        const clients = await prisma.client.findMany({
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
      console.error('Client fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch clients' });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      
      try {
        const client = await prisma.client.findFirst({
          where: { id },
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
      const { name, industry, platforms } = req.body;

      try {
        const tenant = await prisma.tenant.findFirst({
          where: { userId: 'dev_user' },
        });

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
            tenantId: 'dev_tenant',
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
