import { MetaTransformer } from '../../integrations/meta/meta.transformer';

describe('MetaTransformer', () => {
  describe('transformCampaign', () => {
    it('should correctly map campaign ID and name', () => {
      const rawCampaign = {
        id: 'meta_123',
        name: 'Test Campaign',
        status: 'ACTIVE',
      };
      const result = MetaTransformer.transformCampaign(rawCampaign);
      expect(result.metaCampaignId).toBe('meta_123');
      expect(result.name).toBe('Test Campaign');
    });

    it('should convert daily_budget from cents to dollars', () => {
      const rawCampaign = { id: '1', name: 'Test', status: 'ACTIVE', daily_budget: 5000 };
      const result = MetaTransformer.transformCampaign(rawCampaign);
      expect(result.dailyBudget).toBe(50);
    });

    it('should convert lifetime_budget from cents to dollars', () => {
      const rawCampaign = { id: '1', name: 'Test', status: 'ACTIVE', lifetime_budget: 100000 };
      const result = MetaTransformer.transformCampaign(rawCampaign);
      expect(result.lifetimeBudget).toBe(1000);
    });

    it('should correctly parse start and end dates', () => {
      const rawCampaign = {
        id: '1',
        name: 'Test',
        status: 'ACTIVE',
        start_time: '2024-01-01T00:00:00Z',
        end_time: '2024-12-31T00:00:00Z',
      };
      const result = MetaTransformer.transformCampaign(rawCampaign);
      expect(result.startDate).toEqual(new Date('2024-01-01T00:00:00Z'));
      expect(result.endDate).toEqual(new Date('2024-12-31T00:00:00Z'));
    });

    it('should handle missing optional fields gracefully', () => {
      const rawCampaign = { id: '1', name: 'Minimal', status: 'PAUSED' };
      const result = MetaTransformer.transformCampaign(rawCampaign);
      expect(result.dailyBudget).toBeUndefined();
      expect(result.lifetimeBudget).toBeUndefined();
      expect(result.startDate).toBeUndefined();
    });
  });

  describe('transformInsights', () => {
    it('should correctly map spend, impressions, and clicks', () => {
      const rawInsights = {
        spend: 100.5,
        impressions: 1000,
        clicks: 50,
        ctr: 5.0,
        cpc: 2.01,
        cpm: 100.5,
        reach: 800,
        frequency: 1.25,
        social_spend: 80.5,
        unique_clicks: 40,
        unique_ctr: 5.0,
        cost_per_unique_click: 2.51,
        inline_link_clicks: 35,
        inline_link_click_ctr: 4.375,
        cost_per_inline_link_click: 2.87,
      };
      const result = MetaTransformer.transformInsights(rawInsights);
      expect(result.spend).toBe(100.5);
      expect(result.impressions).toBe(1000);
      expect(result.clicks).toBe(50);
      expect(result.uniqueClicks).toBe(40);
    });

    it('should handle missing fields with default values', () => {
      const rawInsights = {
        spend: 50,
        impressions: 500,
        clicks: 25,
        ctr: 5,
        cpc: 2,
        cpm: 100,
        reach: 400,
        frequency: 1.25,
        social_spend: 40,
        unique_clicks: 20,
        unique_ctr: 5,
        cost_per_unique_click: 2.5,
        inline_link_clicks: 15,
        inline_link_click_ctr: 3.75,
        cost_per_inline_link_click: 3.33,
      };
      const result = MetaTransformer.transformInsights(rawInsights);
      expect(result.spend).toBe(50);
      expect(result.uniqueClicks).toBe(20);
    });
  });
});
