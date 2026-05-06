import { Request, Response } from 'express';
import analyticsService from '../services/analytics.service';
import prisma from '../config/database';

/**
 * Analytics Controller — Meta Dashboard MVP
 * Serves the exact layout defined in Meta_dashboard_spec_SR_21042026docx.md
 */
export class AnalyticsController {
  /**
   * GET /api/analytics/meta-dashboard?dateRange=30
   * Returns all 5 datasets for the 7-section Meta dashboard layout
   */
  async getMetaDashboard(req: Request, res: Response): Promise<void> {
    try {
      // Allow passing tenantId or clientId from query, fallback to dev_client
      const tenantId = (req.query.tenantId as string) || (req.query.clientId as string) || 'dev_client';

      // Parse query params
      const dateRange = parseInt(req.query.dateRange as string) || 30;
      const validRanges = [7, 30, 90];
      const dateRangeDays = validRanges.includes(dateRange) ? dateRange : 30;

      const data = await analyticsService.getMetaDashboardData(tenantId, dateRangeDays);

      res.json({
        dateRange: dateRangeDays,
        ...data,
      });
    } catch (error: any) {
      console.error('Analytics meta-dashboard error:', error);
      res.status(500).json({
        error: 'Unable to load data - please refresh',
        message: error.message,
      });
    }
  }
}


export default new AnalyticsController();
