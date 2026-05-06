import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/database';
import { supabase } from '../config/supabase';
import { encrypt } from '../utils/encryption.util';
import googleService from '../services/google.service';

export class GoogleController {
  /**
   * Sync data from Google Ads for a specific connection
   */
  async sync(req: Request, res: Response) {
    try {
      const userId = 'dev_user';
      const id = req.params.id as string;
      const { dateRange = 'LAST_30_DAYS' } = req.body;

      // Verify ownership
      const connection = await prisma.googleConnection.findFirst({
        where: { id, userId },
      });

      if (!connection) {
        return res.status(404).json({ error: 'Connection not found' });
      }

      const result = await googleService.syncCampaigns(id, dateRange);

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json({
        message: `Successfully synced ${result.count} campaigns`,
        syncedCount: result.count,
      });
    } catch (error) {
      console.error('Failed to sync Google Ads data:', error);
      res.status(500).json({ error: 'Failed to sync data' });
    }
  }

  /**
   * Get all Google connections
   */
  async getConnections(req: Request, res: Response) {
    try {
      const userId = 'dev_user';

      const connections = await prisma.googleConnection.findMany({
        where: { userId },
        select: {
          id: true,
          customerId: true,
          status: true,
          lastSyncAt: true,
          syncError: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Get campaign counts for each connection
      const connectionsWithCounts = await Promise.all(
        connections.map(async (conn: any) => {
          const count = await prisma.googleCampaign.count({
            where: { connectionId: conn.id },
          });
          return { ...conn, campaignCount: count };
        })
      );

      res.json(connectionsWithCounts);
    } catch (error) {
      console.error('Failed to get Google connections:', error);
      res.status(500).json({ error: 'Failed to get connections' });
    }
  }

  /**
   * Delete a Google connection and its campaigns
   */
  async deleteConnection(req: Request, res: Response) {
    try {
      const userId = 'dev_user';
      const id = req.params.id as string;

      // Verify ownership
      const connection = await prisma.googleConnection.findFirst({
        where: { id, userId },
      });

      if (!connection) {
        return res.status(404).json({ error: 'Connection not found' });
      }

      // Delete connection and all associated campaigns
      await prisma.googleCampaign.deleteMany({
        where: { connectionId: id },
      });

      await prisma.googleConnection.delete({
        where: { id },
      });

      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete Google connection:', error);
      res.status(500).json({ error: 'Failed to delete connection' });
    }
  }

  /**
   * Connect Google Ads account with credentials
   */
  async connect(req: Request, res: Response) {
    try {
      const userId = 'dev_user';
      const { developerToken, clientId, clientSecret, refreshToken, customerId, appClientId } = req.body;

      // Validate required fields
      if (!developerToken || !clientId || !clientSecret || !refreshToken || !customerId) {
        return res.status(400).json({ error: 'All credentials are required' });
      }

      // Test connection
      const testResult = await googleService.testConnection({
        developerToken,
        clientId,
        clientSecret,
        refreshToken,
        customerId,
      });

      if (!testResult.success) {
        return res.status(400).json({
          error: 'Failed to connect to Google Ads',
          details: testResult.error,
        });
      }

      // Check if connection already exists
      let existingConnection;
      try {
        existingConnection = await prisma.googleConnection.findFirst({
          where: { userId, customerId },
        });
      } catch (e) {
        const { data } = await supabase
          .from('GoogleConnection')
          .select('id')
          .eq('userId', userId)
          .eq('customerId', customerId)
          .maybeSingle();
        existingConnection = data;
      }

      let connection;
      const connectionData = {
        userId,
        appClientId,
        customerId,
        refreshToken: encrypt(refreshToken),
        status: 'active',
        updatedAt: new Date(),
      };

      try {
        if (existingConnection) {
          connection = await prisma.googleConnection.update({
            where: { id: existingConnection.id },
            data: connectionData,
          });
        } else {
          connection = await prisma.googleConnection.create({
            data: connectionData,
          });
        }
      } catch (prismaError) {
        console.warn('Prisma Google connection failed, falling back to Supabase REST API');
        const supabaseData = {
          ...connectionData,
          updatedAt: new Date().toISOString()
        };

        if (existingConnection) {
          const { data: updated, error: updateError } = await supabase
            .from('GoogleConnection')
            .update(supabaseData)
            .eq('id', existingConnection.id)
            .select()
            .single();
          if (updateError) throw updateError;
          connection = updated;
        } else {
          const insertData = { ...supabaseData, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
          const { data: inserted, error: insertError } = await supabase
            .from('GoogleConnection')
            .insert([insertData])
            .select()
            .single();
          if (insertError) throw insertError;
          connection = inserted;
        }
      }

      res.status(201).json({
        id: connection.id,
        customerId: connection.customerId,
        status: connection.status,
      });
    } catch (error) {
      console.error('Google Ads connection error:', error);
      res.status(500).json({
        error: 'Failed to connect Google Ads account',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}


export default new GoogleController();
