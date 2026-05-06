import { Request, Response } from 'express';
import prisma from '../config/database';
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
}


export default new GoogleController();
