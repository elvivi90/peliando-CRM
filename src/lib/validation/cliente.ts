import { z } from "zod";

export const clienteSchema = z
  .object({
    nombreNegocio: z
      .string()
      .optional()
      .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined)),
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
  })
  // Un mayorista o distribuidor se identifica por su negocio; nombre y
  // apellido son la persona de contacto.
  .refine((c) => c.tipo === "MINORISTA" || c.nombreNegocio, {
    message: "El nombre del negocio es obligatorio para mayoristas y distribuidores",
    path: ["nombreNegocio"],
  });

export type ClienteInput = z.input<typeof clienteSchema>;
