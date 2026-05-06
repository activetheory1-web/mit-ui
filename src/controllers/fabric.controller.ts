import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/database';
import { supabase } from '../config/supabase';
import { encrypt } from '../utils/encryption.util';

export class FabricController {

  async connect(req: Request, res: Response) {
    try {
      const userId = 'dev_user';
      const { workspaceId, capacityId, clientId, clientSecret, tenantId, appClientId } = req.body;

      if (!workspaceId || !clientId || !clientSecret || !tenantId) {
        return res.status(400).json({ error: 'Required fields are missing' });
      }

      // Check if connection already exists
      let existingConnection;
      try {
        existingConnection = await prisma.fabricConnection.findFirst({
          where: { userId, workspaceId, appClientId },
        });
      } catch (e) {
        const { data } = await supabase
          .from('FabricConnection')
          .select('id')
          .eq('userId', userId)
          .eq('workspaceId', workspaceId)
          .eq('appClientId', appClientId)
          .maybeSingle();
        existingConnection = data;
      }

      let connection;

      try {
        if (existingConnection) {
          connection = await prisma.fabricConnection.update({
            where: { id: existingConnection.id },
            data: {
              capacityId,
              clientId,
              clientSecret,
              tenantId,
              appClientId,
              status: 'active',
              updatedAt: new Date(),
            },
          });
        } else {
          connection = await prisma.fabricConnection.create({
            data: {
              userId,
              appClientId,
              workspaceId,
              capacityId,
              clientId,
              clientSecret: encrypt(clientSecret),
              tenantId,
              status: 'active',
            },
          });
        }

      } catch (prismaError) {
        console.warn('Prisma Fabric connection failed, falling back to Supabase REST API');
        
        const connectionData = {
          userId,
          appClientId,
          workspaceId,
          capacityId,
          clientId,
          clientSecret,
          tenantId,
          status: 'active',
          updatedAt: new Date().toISOString()
        };

        if (existingConnection) {
          const { data: updated, error: updateError } = await supabase
            .from('FabricConnection')
            .update(connectionData)
            .eq('id', existingConnection.id)
            .select()
            .single();
          
          if (updateError) throw updateError;
          connection = updated;
        } else {
          const insertData = { ...connectionData, id: crypto.randomUUID() };
          const { data: inserted, error: insertError } = await supabase
            .from('FabricConnection')
            .insert([insertData])
            .select()
            .single();
          
          if (insertError) throw insertError;
          connection = inserted;
        }
      }

      res.status(201).json({
        id: connection.id,
        workspaceId: connection.workspaceId,
        status: connection.status,
      });
    } catch (error) {
      console.error('Fabric connection error:', error);
      res.status(500).json({ error: 'Failed to connect Fabric' });
    }
  }

  /**
   * Get Fabric configuration for a specific app client
   */
  async getConfig(req: Request, res: Response) {
    try {
      const userId = 'dev_user';
      const { appClientId } = req.query;

      if (!appClientId) {
        return res.status(400).json({ error: 'appClientId is required' });
      }

      let connection;
      try {
        connection = await prisma.fabricConnection.findFirst({
          where: { userId, appClientId: appClientId as string },
        });
      } catch (e) {
        const { data } = await supabase
          .from('FabricConnection')
          .select('*')
          .eq('userId', userId)
          .eq('appClientId', appClientId as string)
          .maybeSingle();
        connection = data;
      }

      if (!connection) {
        return res.status(404).json({ error: 'Configuration not found' });
      }

      res.json(connection);
    } catch (error) {
      console.error('Failed to get Fabric config:', error);
      res.status(500).json({ error: 'Failed to get configuration' });
    }
  }


  async getConnections(req: Request, res: Response) {
    try {
      const userId = 'dev_user';

      let connections;
      try {
        connections = await prisma.fabricConnection.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
      } catch (prismaError) {
        const { data, error } = await supabase
          .from('FabricConnection')
          .select('*')
          .eq('userId', userId)
          .order('createdAt', { ascending: false });
        
        if (error) throw error;
        connections = data || [];
      }

      res.json(connections);
    } catch (error) {
      console.error('Failed to get Fabric connections:', error);
      res.status(500).json({ error: 'Failed to get connections' });
    }
  }

  async deleteConnection(req: Request, res: Response) {
    try {
      const userId = 'dev_user';
      const id = req.params.id as string;

      try {
        await prisma.fabricConnection.delete({
          where: { id, userId },
        });
      } catch (prismaError) {
        const { error } = await supabase
          .from('FabricConnection')
          .delete()
          .eq('id', id)
          .eq('userId', userId);

        if (error) throw error;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete Fabric connection:', error);
      res.status(500).json({ error: 'Failed to delete connection' });
    }
  }
}

export default new FabricController();
