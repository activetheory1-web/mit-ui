import cron from 'node-cron';
import prisma from '../config/database';
import metaService from '../services/meta.service';
import googleService from '../services/google.service';

export class SyncJob {
  /**
   * Initializes the cron job to run every night at 2:00 AM
   */
  start() {
    console.log('Starting nightly sync cron job schedule (2:00 AM daily)...');

    // Schedule: "0 2 * * *" -> 2:00 AM every day
    cron.schedule('0 2 * * *', async () => {
      console.log(`[Nightly Sync] Starting scheduled data sync at ${new Date().toISOString()}`);
      await this.runAllSyncs();
    });
  }

  /**
   * Executes the sync logic for all active connections across all users
   */
  async runAllSyncs() {
    try {
      // 1. Fetch all active Meta connections
      const metaConnections = await prisma.metaConnection.findMany({
        where: { status: 'active' },
      });

      console.log(`[Nightly Sync] Found ${metaConnections.length} active Meta connections.`);
      for (const conn of metaConnections) {
        try {
          await metaService.syncCampaigns(conn.userId, conn.id);
        } catch (err: any) {
          console.error(`[Nightly Sync] Failed to sync Meta connection ${conn.id}:`, err.message);
        }
      }

      // 2. Fetch all active Google connections
      const googleConnections = await prisma.googleConnection.findMany({
        where: { status: 'active' },
      });

      console.log(`[Nightly Sync] Found ${googleConnections.length} active Google connections.`);
      for (const conn of googleConnections) {
        try {
          await googleService.syncCampaigns(conn.id);
        } catch (err: any) {
          console.error(`[Nightly Sync] Failed to sync Google connection ${conn.id}:`, err.message);
        }
      }

      console.log(`[Nightly Sync] Finished scheduled data sync at ${new Date().toISOString()}`);
    } catch (error) {
      console.error('[Nightly Sync] Critical error during nightly sync:', error);
    }
  }
}

export default new SyncJob();
