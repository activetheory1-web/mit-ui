import { z } from 'zod';

export const createCampaignSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Campaign name is required'),
    clientId: z.string().min(1, 'Client ID is required'),
    channel: z.string().min(1, 'Channel is required'),
    spend: z.number().min(0, 'Spend must be a positive number'),
    budget: z.number().min(0, 'Budget must be a positive number'),
    roas: z.number().optional().default(0),
    ctr: z.number().optional().default(0),
    cpc: z.number().optional().default(0),
    conv: z.number().int().optional().default(0),
    status: z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED']),
    change: z.number().optional().default(0),
    impressions: z.number().int().optional().default(0),
    clicks: z.number().int().optional().default(0),
    frequency: z.number().optional().default(0),
    active: z.boolean().optional().default(true),
  }),
});

export const updateCampaignSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid Campaign ID'),
  }),
  body: z.object({
    name: z.string().optional(),
    clientId: z.string().optional(),
    channel: z.string().optional(),
    spend: z.number().min(0).optional(),
    budget: z.number().min(0).optional(),
    roas: z.number().optional(),
    ctr: z.number().optional(),
    cpc: z.number().optional(),
    conv: z.number().int().optional(),
    status: z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED']).optional(),
    change: z.number().optional(),
    impressions: z.number().int().optional(),
    clicks: z.number().int().optional(),
    frequency: z.number().optional(),
    active: z.boolean().optional(),
  }),
});

export const getCampaignParamsSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid Campaign ID'),
  }),
});
