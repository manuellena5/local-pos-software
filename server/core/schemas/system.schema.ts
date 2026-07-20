import { z } from 'zod';

export const resetDemoDataSchema = z.object({
  confirm: z.string(),
});

export type ResetDemoDataRequest = z.infer<typeof resetDemoDataSchema>;
