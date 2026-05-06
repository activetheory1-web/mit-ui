import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/database';
import { supabase } from '../config/supabase';
import { encrypt } from '../utils/encryption.util';

export class AzureController {

  async connect(req: Request, res: Response) {
    try {
      const userId = 'dev_user';
      const { subscriptionId, resourceGroup, workspaceName, clientId, clientSecret, tenantId, appClientId } = req.body;

      if (!subscriptionId || !resourceGroup || !workspaceName || !clientId || !clientSecret || !tenantId) {
        return res.status(400).json({ error: 'Required fields are missing' });
      }

      // Check if connection already exists
      let existingConnection;
      try {
        existingConnection = await prisma.azureConnection.findFirst({
          where: { userId, subscriptionId, workspaceName, appClientId },
        });
      } catch (e) {
        const { data } = await supabase
          .from('AzureConnection')
          .select('id')
          .eq('userId', userId)
          .eq('subscriptionId', subscriptionId)
          .eq('workspaceName', workspaceName)
          .eq('appClientId', appClientId)
          .maybeSingle();
        existingConnection = data;
      }

      let connection;

      try {
        if (existingConnection) {
          connection = await prisma.azureConnection.update({
            where: { id: existingConnection.id },
            data: {
              resourceGroup,
              clientId,
              clientSecret,
              tenantId,
              appClientId,
              status: 'active',
              updatedAt: new Date(),
            },
          });
        } else {
          connection = await prisma.azureConnection.create({
            data: {
              userId,
              appClientId,
              subscriptionId,
              resourceGroup,
              workspaceName,
              clientId,
              clientSecret: encrypt(clientSecret),
              tenantId,
              status: 'active',
            },
          });
        }

      } catch (prismaError) {
        console.warn('Prisma Azure connection failed, falling back to Supabase REST API');
        
        const connectionData = {
          userId,
          appClientId,
          subscriptionId,
          resourceGroup,
          workspaceName,
          clientId,
          clientSecret,
          tenantId,
          status: 'active',
          updatedAt: new Date().toISOString()
        };

        if (existingConnection) {
          const { data: updated, error: updateError } = await supabase
            .from('AzureConnection')
            .update(connectionData)
            .eq('id', existingConnection.id)
            .select()
            .single();
          
          if (updateError) throw updateError;
          connection = updated;
        } else {
          const insertData = { ...connectionData, id: crypto.randomUUID() };
          const { data: inserted, error: insertError } = await supabase
            .from('AzureConnection')
            .insert([insertData])
            .select()
            .single();
          
          if (insertError) throw insertError;
          connection = inserted;
        }
      }

      res.status(201).json({
        id: connection.id,
        workspaceName: connection.workspaceName,
        status: connection.status,
      });
    } catch (error) {
      console.error('Azure connection error:', error);
      res.status(500).json({ error: 'Failed to connect Azure' });
    }
  }

  /**
   * Get Azure configuration for a specific app client
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
        connection = await prisma.azureConnection.findFirst({
          where: { userId, appClientId: appClientId as string },
        });
      } catch (e) {
        const { data } = await supabase
          .from('AzureConnection')
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
      console.error('Failed to get Azure config:', error);
      res.status(500).json({ error: 'Failed to get configuration' });
    }
  }


  async getConnections(req: Request, res: Response) {
    try {
      const userId = 'dev_user';

      let connections;
      try {
        connections = await prisma.azureConnection.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
      } catch (prismaError) {
        const { data, error } = await supabase
          .from('AzureConnection')
          .select('*')
          .eq('userId', userId)
          .order('createdAt', { ascending: false });
        
        if (error) throw error;
        connections = data || [];
      }

      res.json(connections);
    } catch (error) {
      console.error('Failed to get Azure connections:', error);
      res.status(500).json({ error: 'Failed to get connections' });
    }
  }

  async deleteConnection(req: Request, res: Response) {
    try {
      const userId = 'dev_user';
      const id = req.params.id as string;

      try {
        await prisma.azureConnection.delete({
          where: { id, userId },
        });
      } catch (prismaError) {
        const { error } = await supabase
          .from('AzureConnection')
          .delete()
          .eq('id', id)
          .eq('userId', userId);

        if (error) throw error;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete Azure connection:', error);
      res.status(500).json({ error: 'Failed to delete connection' });
    }
  }
}

export default new AzureController();
