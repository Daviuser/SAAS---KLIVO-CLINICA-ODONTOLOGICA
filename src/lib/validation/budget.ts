import { z } from "zod";

export const budgetItemSchema = z.object({
  procedureId: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  discount: z.number().nonnegative().default(0),
});

export const budgetSchema = z.object({
  professionalUserId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(budgetItemSchema).min(1, "Adicione ao menos um procedimento"),
});
