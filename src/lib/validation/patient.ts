import { z } from "zod";

export const patientSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  document: z.string().optional().nullable(),
  birthDate: z.string().datetime().optional().nullable(), // ISO string
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  addressStreet: z.string().optional().nullable(),
  addressNumber: z.string().optional().nullable(),
  addressComplement: z.string().optional().nullable(),
  addressCity: z.string().optional().nullable(),
  addressState: z.string().optional().nullable(),
  addressZipCode: z.string().optional().nullable(),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type PatientInput = z.infer<typeof patientSchema>;
