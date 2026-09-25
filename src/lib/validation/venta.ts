import { z } from "zod";
import { parseFechaInput } from "@/lib/date";

export const ventaSchema = z.object({
  // Vacio = venta rapida (minorista sin cliente)
  clienteId: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v : undefined)),
  productoId: z.string().min(1, "Elegí un producto"),
  // Tramo de la lista elegido a mano (vacio = el que corresponde a la cantidad)
  tramoId: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v : undefined)),
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
    .transform((v) => (v && v.trim() !== "" ? parseFechaInput(v) : new Date())),
});

export type VentaInput = z.input<typeof ventaSchema>;

// Tiendup trae precio y cantidades de la orden, y la venta de una
// liquidacion es espejo de LiquidacionConcesion: editarlas desde el
// formulario las desincronizaria de su origen.
export function esVentaEditable(venta: { origen: string; tipo: string }) {
  return venta.origen === "MANUAL" && venta.tipo !== "CONCESION";
}
