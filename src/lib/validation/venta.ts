import { z } from "zod";

export const ventaSchema = z.object({
  clienteId: z.string().min(1, "Elegí un cliente"),
  productoId: z.string().min(1, "Elegí un producto"),
  eventoId: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v : undefined)),
  cantidad: z.coerce.number().int().positive("La cantidad debe ser mayor a 0"),
  cantidadEntregada: z.coerce.number().int().min(0),
  precioUnitarioManual: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? Number(v) : undefined)),
  montoCobrado: z.coerce.number().min(0).default(0),
  descripcion: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v : undefined)),
  fecha: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? new Date(v) : new Date())),
});

export type VentaInput = z.input<typeof ventaSchema>;
