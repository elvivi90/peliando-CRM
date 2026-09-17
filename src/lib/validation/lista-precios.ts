import { z } from "zod";

export const tramoSchema = z.object({
  cantidadDesde: z.coerce.number().int().positive("Debe ser mayor a 0"),
  precioUnitario: z.coerce.number().positive("Debe ser mayor a 0"),
});

export const listaPreciosSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  pvp: z.coerce.number().positive("El PVP debe ser mayor a 0"),
  tramos: z
    .array(tramoSchema)
    .min(1, "Agregá al menos un tramo de precio")
    .refine(
      (tramos) => new Set(tramos.map((t) => t.cantidadDesde)).size === tramos.length,
      "No puede haber dos tramos con la misma cantidad desde",
    ),
});

export type ListaPreciosInput = z.infer<typeof listaPreciosSchema>;
