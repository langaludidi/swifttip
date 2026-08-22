import { z } from "zod";

export const tipQuoteRequestSchema = z.object({
  endpointToken: z.string().trim().min(3).max(128),
  grossGratuityCents: z.number().int().positive()
});
export const createTipRequestSchema = tipQuoteRequestSchema.extend({
  idempotencyKey: z.string().trim().min(8).max(200)
});
export type TipQuoteRequest = z.infer<typeof tipQuoteRequestSchema>;
export type CreateTipRequest = z.infer<typeof createTipRequestSchema>;
