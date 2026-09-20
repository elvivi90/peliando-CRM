import { z } from "zod";

export const clienteSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  apellido: z.string().trim().min(1, "El apellido es obligatorio"),
  email: z.string().trim().email("Email inválido").optional().or(z.literal("")),
  telefono: z.string().trim().optional().or(z.literal("")),
  direccion: z.string().trim().optional().or(z.literal("")),
  tipo: z.enum(["MINORISTA", "MAYORISTA", "DISTRIBUIDOR"]),
  precioParticular: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v : undefined)),
  listaPrecioId: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v : undefined)),
});

export type ClienteInput = z.infer<typeof clienteSchema>;
