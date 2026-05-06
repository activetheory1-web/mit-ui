import { z } from 'zod';

export const createDashboardSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Dashboard name is required'),
    description: z.string().min(1, 'Description is required'),
    clientId: z.string().min(1, 'Client ID is required'),
    widgets: z.number().int().min(0).optional().default(0),
    updated: z.string().datetime().optional(),
    schedule: z.string().nullable().optional(),
    recipients: z.number().int().min(0).optional().default(0),
    favorite: z.boolean().optional().default(false),
    color: z.string().optional().default('blue'),
  }),
});

export const updateDashboardSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid Dashboard ID'),
  }),
  body: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    clientId: z.string().optional(),
    widgets: z.number().int().min(0).optional(),
    updated: z.string().datetime().optional(),
    schedule: z.string().nullable().optional(),
    recipients: z.number().int().min(0).optional(),
    favorite: z.boolean().optional(),
    color: z.string().optional(),
  }),
});

export const getDashboardParamsSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid Dashboard ID'),
  }),
});
