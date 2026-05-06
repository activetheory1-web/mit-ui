import { Request, Response } from 'express';
import prisma from '../config/database';
import { supabase } from '../config/supabase';
import { MetaFetcher } from '../integrations/meta/meta.fetcher';
import metaService from '../services/meta.service';

export class MetaController {
  /**
   * Connect Meta account with credentials
   */
  async connect(req: Request, res: Response) {
    try {
      const userId = 'dev_user';
      const { appId, appSecret, accessToken, adAccountId, appClientId } = req.body;

      // Validate required fields
      if (!appId || !appSecret || !accessToken || !adAccountId) {
        return res.status(400).json({ error: 'All credentials are required' });
      }

      // Test connection
      const fetcher = new MetaFetcher({
        appId,
        appSecret,
        accessToken,
        adAccountId,
      });

      const testResult = await fetcher.testConnection();

      if (!testResult.success) {
        return res.status(400).json({
          error: 'Failed to connect to Meta',
          details: testResult.error,
        });
      }

      // Check if connection already exists for this user and account
      let existingConnection;
      try {
        existingConnection = await prisma.metaConnection.findFirst({
          where: {
            userId,
            adAccountId,
          },
        });
      } catch (e) {
        // Fallback for check
        const { data } = await supabase
          .from('MetaConnection')
          .select('id')
          .eq('userId', userId)
          .eq('adAccountId', adAccountId)
          .maybeSingle();
        existingConnection = data;
      }

      let connection;

      try {
        if (existingConnection) {
          // Update existing connection
          connection = await prisma.metaConnection.update({
            where: { id: existingConnection.id },
            data: {
              appId,
              appSecret,
              accessToken,
              appClientId,
              accountName: testResult.accountName || 'Meta Ads Account',
              status: 'active',
              lastSyncAt: null,
              syncError: null,
              updatedAt: new Date(),
            },
          });
        } else {
          // Create new connection
          connection = await prisma.metaConnection.create({
            data: {
              userId,
              appClientId,
              appId,
              appSecret,
              accessToken,
              adAccountId,
              accountName: testResult.accountName || 'Meta Ads Account',
              status: 'active',
            },
          });
        }
      } catch (prismaError) {
        console.warn('Prisma Meta connection failed, falling back to Supabase REST API');
        
        const connectionData = {
          userId,
          appClientId,
          appId,
          appSecret,
          accessToken,
          adAccountId,
          accountName: testResult.accountName || 'Meta Ads Account',
          status: 'active',
          updatedAt: new Date().toISOString()
        };

        if (existingConnection) {
          // Update existing
          const { data: updated, error: updateError } = await supabase
            .from('MetaConnection')
            .update(connectionData)
            .eq('id', existingConnection.id)
            .select()
            .single();
          
          if (updateError) throw updateError;
          connection = updated;
        } else {
          // Insert new
          const { data: inserted, error: insertError } = await supabase
            .from('MetaConnection')
            .insert([connectionData])
            .select()
            .single();
          
          if (insertError) throw insertError;
          connection = inserted;
        }
      }

      res.status(201).json({
        id: connection.id,
        accountName: connection.accountName,
        adAccountId: connection.adAccountId,
        status: connection.status,
        lastSyncAt: connection.lastSyncAt,
      });
    } catch (error) {
      console.error('Meta connection error:', error);
      res.status(500).json({
        error: 'Failed to connect Meta account',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get all Meta connections
   */
  async getConnections(req: Request, res: Response) {
    try {
      const userId = 'dev_user';

      let connections;
      try {
        connections = await prisma.metaConnection.findMany({
          where: { userId },
          select: {
            id: true,
            accountName: true,
            adAccountId: true,
            status: true,
            lastSyncAt: true,
            syncError: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });
      } catch (prismaError) {
        console.warn('Prisma get Meta connections failed, falling back to Supabase REST API');
        const { data, error } = await supabase
          .from('MetaConnection')
          .select('*')
          .eq('userId', userId)
          .order('createdAt', { ascending: false });
        
        if (error) throw error;
        connections = data || [];
      }

      if (connections.length === 0) {
        return res.json([]);
      }

      // Get campaign count for each connection
      const connectionsWithCount = await Promise.all(
        connections.map(async (connection: any) => {
          let campaignCount = 0;
          try {
            campaignCount = await prisma.metaCampaign.count({
              where: { connectionId: connection.id },
            });
          } catch (e) {
            // Fallback for campaign count using Supabase REST
            const { count } = await supabase
              .from('MetaCampaign')
              .select('*', { count: 'exact', head: true })
              .eq('connectionId', connection.id);
            campaignCount = count || 0;
          }

          return {
            ...connection,
            campaignCount,
          };
        })
      );

      res.json(connectionsWithCount);
    } catch (error) {
      console.error('Failed to get Meta connections:', error);
      res.status(500).json({ error: 'Failed to get connections' });
    }
  }

  /**
   * Delete a Meta connection
   */
  async deleteConnection(req: Request, res: Response) {
    try {
      const userId = 'dev_user';
      const id = req.params.id as string;

      try {
        // Delete connection and all associated campaigns
        await prisma.metaCampaign.deleteMany({
          where: { connectionId: id },
        });

        await prisma.metaConnection.delete({
          where: { id, userId },
        });
      } catch (prismaError) {
        console.warn('Prisma delete Meta connection failed, falling back to Supabase REST API');
        
        // Delete campaigns first
        await supabase
          .from('MetaCampaign')
          .delete()
          .eq('connectionId', id);

        const { error } = await supabase
          .from('MetaConnection')
          .delete()
          .eq('id', id)
          .eq('userId', userId);

        if (error) throw error;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Failed to delete Meta connection:', error);
      res.status(500).json({ error: 'Failed to delete connection' });
    }
  }

  /**
   * Trigger manual sync for a connection
   */
  async sync(req: Request, res: Response) {
    try {
      const userId = 'dev_user';
      const id = req.params.id as string;
      const { dateRange = 'maximum' } = req.body;

      const result = await metaService.syncCampaigns(userId, id, dateRange);

      res.json({
        success: true,
        campaignsSynced: result.campaignsSynced,
        syncedAt: result.syncedAt,
      });
    } catch (error) {
      console.error('Meta sync error:', error);

      // Update connection status with error
      try {
        await prisma.metaConnection.update({
          where: { id: req.params.id as string },
          data: {
            status: 'error',
            syncError: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      } catch (updateError) {
        console.error('Failed to update connection status:', updateError);
      }

      res.status(500).json({
        error: 'Failed to sync Meta data',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get sync status for a connection
   */
  async getStatus(req: Request, res: Response) {
    try {
      const userId = 'dev_user';
      const id = req.params.id as string;

      let connection;
      try {
        connection = await prisma.metaConnection.findFirst({
          where: { id, userId },
          select: {
            id: true,
            accountName: true,
            adAccountId: true,
            status: true,
            lastSyncAt: true,
            syncError: true,
            createdAt: true,
            updatedAt: true,
          },
        });
      } catch (e) {
        const { data } = await supabase
          .from('MetaConnection')
          .select('*')
          .eq('id', id)
          .eq('userId', userId)
          .single();
        connection = data;
      }

      if (!connection) {
        return res.status(404).json({ error: 'Connection not found' });
      }

      // Get campaign count
      let campaignCount = 0;
      try {
        campaignCount = await prisma.metaCampaign.count({
          where: { connectionId: id },
        });
      } catch (e) {
        const { count } = await supabase
          .from('MetaCampaign')
          .select('*', { count: 'exact', head: true })
          .eq('connectionId', id);
        campaignCount = count || 0;
      }

      res.json({
        ...connection,
        campaignCount,
      });
    } catch (error) {
      console.error('Failed to get Meta connection status:', error);
      res.status(500).json({ error: 'Failed to get status' });
    }
  }

  /**
   * Get campaigns for a specific connection
   */
  async getCampaigns(req: Request, res: Response) {
    try {
      const userId = 'dev_user';
      const connectionId = req.params.connectionId as string;

      // Verify ownership
      let connection;
      try {
        connection = await prisma.metaConnection.findFirst({
          where: { id: connectionId, userId },
        });
      } catch (e) {
        const { data } = await supabase
          .from('MetaConnection')
          .select('id')
          .eq('id', connectionId)
          .eq('userId', userId)
          .single();
        connection = data;
      }

      if (!connection) {
        return res.status(404).json({ error: 'Connection not found' });
      }

      let campaigns;
      try {
        campaigns = await prisma.metaCampaign.findMany({
          where: { connectionId },
          orderBy: {
            syncedAt: 'desc',
          },
        });
      } catch (e) {
        const { data } = await supabase
          .from('MetaCampaign')
          .select('*')
          .eq('connectionId', connectionId)
          .order('syncedAt', { ascending: false });
        campaigns = data || [];
      }

      res.json(campaigns);
    } catch (error) {
      console.error('Failed to get Meta campaigns:', error);
      res.status(500).json({ error: 'Failed to get campaigns' });
    }
  }
  /**
   * Test Meta connection with provided credentials (no auth required)
   * This is a backend proxy to avoid browser CORS issues with graph.facebook.com
   */
  async testConnection(req: Request, res: Response) {
    try {
      const { appId, appSecret, accessToken, adAccountId } = req.body;

      if (!accessToken || !adAccountId) {
        return res.status(400).json({
          success: false,
          error: 'Access Token and Ad Account ID are required',
        });
      }

      const fetcher = new MetaFetcher({
        appId: appId || '',
        appSecret: appSecret || '',
        accessToken,
        adAccountId: adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`,
      });

      const result = await fetcher.testConnection();

      res.json({
        success: result.success,
        accountName: result.accountName || null,
        error: result.error || null,
      });
    } catch (error: any) {
      console.error('Meta test connection error:', error);
      res.json({
        success: false,
        error: error.message || 'Connection test failed',
      });
    }
  }

  /**
   * Fetch campaigns directly using provided credentials (backend proxy)
   */
  async proxyFetchCampaigns(req: Request, res: Response) {
    try {
      const { appId, appSecret, accessToken, adAccountId, dateRange = 'maximum', clientId = 'meta' } = req.body;

      if (!accessToken || !adAccountId) {
        return res.status(400).json({
          error: 'Access Token and Ad Account ID are required',
        });
      }

      const fetcher = new MetaFetcher({
        appId: appId || '',
        appSecret: appSecret || '',
        accessToken,
        adAccountId: adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`,
      });

      const campaigns = await fetcher.fetchAllCampaigns({ dateRange });
      
      // Transform TransformedCampaign to the format expected by the frontend types
      const formattedCampaigns = campaigns.map((c) => ({
        id: parseInt(c.metaCampaignId?.slice(-10) || String(Math.floor(Math.random() * 1000000000))), 
        clientId: clientId,
        name: c.name,
        channel: 'Meta',
        spend: Number(c.spend || 0),
        budget: Number(c.dailyBudget || c.lifetimeBudget || 0),
        ctr: Number(c.ctr || 0),
        cpc: Number(c.cpc || 0),
        cpm: Number(c.cpm || 0),
        status: c.status === 'ACTIVE' ? 'healthy' : c.status === 'PAUSED' ? 'warning' : 'critical',
        change: 0,
        impressions: Number(c.impressions || 0),
        clicks: Number(c.clicks || 0),
        frequency: Number(c.frequency || 0),
        active: c.status === 'ACTIVE',
        startDate: c.startDate ? c.startDate.toISOString() : undefined,
        endDate: c.endDate ? c.endDate.toISOString() : undefined,
        objective: c.objective || undefined,
        reach: Number(c.reach || 0),
        socialSpend: Number(c.socialSpend || 0),
        uniqueClicks: Number(c.uniqueClicks || 0),
        uniqueCtr: Number(c.uniqueCtr || 0),
        costPerUniqueClick: Number(c.costPerUniqueClick || 0),
        inlineLinkClicks: Number(c.inlineLinkClicks || 0),
        inlineLinkClickCtr: Number(c.inlineLinkClickCtr || 0),
        costPerInlineLinkClick: Number(c.costPerInlineLinkClick || 0),
      }));

      res.json(formattedCampaigns);
    } catch (error: any) {
      console.error('Meta proxy fetch error:', error);
      res.status(500).json({
        error: 'Failed to fetch campaigns from Meta',
        details: error.message || 'Unknown error',
      });
    }
  }
}

export default new MetaController();
