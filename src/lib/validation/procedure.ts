import { z } from "zod";

export const procedureSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  category: z.string().optional().nullable(),
  defaultPrice: z.number().nonnegative(),
});
