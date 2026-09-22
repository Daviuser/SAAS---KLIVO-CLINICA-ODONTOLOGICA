import { z } from "zod";

export const appointmentSchema = z.object({
  patientId: z.string().min(1),
  professionalUserId: z.string().min(1),
  resourceId: z.string().optional().nullable(),
  procedureId: z.string().optional().nullable(),
  startsAt: z.string().datetime(),
  durationMinutes: z.number().int().positive().default(30),
  notes: z.string().optional().nullable(),
});

export const appointmentUpdateSchema = z.object({
  status: z.enum(["agendada", "confirmada", "em_atendimento", "concluida", "cancelada", "faltou"]).optional(),
  startsAt: z.string().datetime().optional(),
  durationMinutes: z.number().int().positive().optional(),
  resourceId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
