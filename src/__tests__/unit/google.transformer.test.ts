import { GoogleTransformer } from '../../integrations/google/google.transformer';

describe('GoogleTransformer', () => {
  describe('transformCampaigns', () => {
    it('should correctly convert cost_micros to standard currency', () => {
      const raw = [
        {
          campaign: { id: '1', name: 'Test', status: 'ENABLED' },
          metrics: {
            cost_micros: 5000000,
            impressions: 1000,
            clicks: 50,
            conversions: 5,
            conversions_value: 100,
          },
        },
      ];
      const result = GoogleTransformer.transformCampaigns(raw);
      expect(result[0].spend).toBeCloseTo(5.0);
    });

    it('should calculate CTR correctly', () => {
      const raw = [
        {
          campaign: { id: '1', name: 'Test', status: 'ENABLED' },
          metrics: {
            cost_micros: 0,
            impressions: 200,
            clicks: 20,
            conversions: 0,
            conversions_value: 0,
          },
        },
      ];
      const result = GoogleTransformer.transformCampaigns(raw);
      expect(result[0].ctr).toBeCloseTo(10.0);
    });

    it('should calculate CPC correctly', () => {
      const raw = [
        {
          campaign: { id: '1', name: 'Test', status: 'ENABLED' },
          metrics: {
            cost_micros: 10000000,
            impressions: 500,
            clicks: 100,
            conversions: 0,
            conversions_value: 0,
          },
        },
      ];
      const result = GoogleTransformer.transformCampaigns(raw);
      expect(result[0].cpc).toBeCloseTo(0.1);
    });

    it('should return 0 for CTR and CPC when impressions/clicks are 0', () => {
      const raw = [
        {
          campaign: { id: '1', name: 'Test', status: 'ENABLED' },
          metrics: {
            cost_micros: 0,
            impressions: 0,
            clicks: 0,
            conversions: 0,
            conversions_value: 0,
          },
        },
      ];
      const result = GoogleTransformer.transformCampaigns(raw);
      expect(result[0].ctr).toBe(0);
      expect(result[0].cpc).toBe(0);
    });

    it('should map ENABLED status to ACTIVE', () => {
      const raw = [
        {
          campaign: { id: '1', name: 'Test', status: 'ENABLED' },
          metrics: {
            cost_micros: 0,
            impressions: 0,
            clicks: 0,
            conversions: 0,
            conversions_value: 0,
          },
        },
      ];
      const result = GoogleTransformer.transformCampaigns(raw);
      expect(result[0].status).toBe('ACTIVE');
    });

    it('should map REMOVED status to ARCHIVED', () => {
      const raw = [
        {
          campaign: { id: '1', name: 'Old', status: 'REMOVED' },
          metrics: {
            cost_micros: 0,
            impressions: 0,
            clicks: 0,
            conversions: 0,
            conversions_value: 0,
          },
        },
      ];
      const result = GoogleTransformer.transformCampaigns(raw);
      expect(result[0].status).toBe('ARCHIVED');
    });

    it('should default to PAUSED for unknown statuses', () => {
      const raw = [
        {
          campaign: { id: '1', name: 'X', status: 'UNKNOWN' },
          metrics: {
            cost_micros: 0,
            impressions: 0,
            clicks: 0,
            conversions: 0,
            conversions_value: 0,
          },
        },
      ];
      const result = GoogleTransformer.transformCampaigns(raw);
      expect(result[0].status).toBe('PAUSED');
    });

    it('should handle empty array', () => {
      const result = GoogleTransformer.transformCampaigns([]);
      expect(result).toEqual([]);
    });

    it('should use fallback values for missing campaign data', () => {
      const raw = [{ campaign: {}, metrics: {} }];
      const result = GoogleTransformer.transformCampaigns(raw);
      expect(result[0].campaignId).toBe('unknown');
      expect(result[0].name).toBe('Unnamed Campaign');
    });
  });
});
