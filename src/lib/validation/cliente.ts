import { z } from "zod";
import { normalizarInstagram } from "@/lib/format";

export const clienteSchema = z
  .object({
    nombreNegocio: z
      .string()
      .optional()
      .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined)),
    // Obligatorios solo en minoristas (ver refine): en un mayorista o
    // distribuidor son el contacto, que es opcional.
    nombre: z.string().trim(),
    apellido: z.string().trim(),
    email: z.string().trim().email("Email inválido").optional().or(z.literal("")),
    telefono: z.string().trim().optional().or(z.literal("")),
    direccion: z.string().trim().optional().or(z.literal("")),
    instagram: z
      .string()
      .optional()
      .refine((v) => !v?.trim() || normalizarInstagram(v), "Usuario de Instagram inválido")
      .transform((v) => normalizarInstagram(v) ?? undefined),
    tipo: z.enum(["MINORISTA", "MAYORISTA", "DISTRIBUIDOR"]),
  })
  // Un mayorista o distribuidor se identifica por su negocio; nombre y
  // apellido son la persona de contacto (opcional). Un minorista se
  // identifica por su nombre y apellido.
  .refine((c) => c.tipo === "MINORISTA" || c.nombreNegocio, {
    message: "El nombre del negocio es obligatorio para mayoristas y distribuidores",
    path: ["nombreNegocio"],
  })
  .refine((c) => c.tipo !== "MINORISTA" || c.nombre, {
    message: "El nombre es obligatorio",
    path: ["nombre"],
  })
  .refine((c) => c.tipo !== "MINORISTA" || c.apellido, {
    message: "El apellido es obligatorio",
    path: ["apellido"],
  });

export type ClienteInput = z.input<typeof clienteSchema>;
