import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Senha precisa ter ao menos 8 caracteres"),
  roleId: z.string().min(1, "Selecione um papel"),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  roleId: z.string().min(1).optional(),
  active: z.boolean().optional(),
});
