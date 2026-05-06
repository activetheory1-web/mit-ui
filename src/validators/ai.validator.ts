import { z } from 'zod';

export const generateDashboardSchema = z.object({
  body: z.object({
    prompt: z
      .string()
      .min(3, 'Prompt must be at least 3 characters long'),
    clientId: z.string().optional(),
  }),
});
