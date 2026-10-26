import { z } from "zod";
import { parseFechaInput } from "@/lib/date";

const opcional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : null));
const requerido = (mensaje: string) => z.string().trim().min(1, mensaje);

// Destinatario y direccion de un envio por Correo Argentino (ver modelo Envio).
export const envioSchema = z.object({
  destinatarioNombre: requerido("Falta el nombre del destinatario"),
  destinatarioEmail: z.string().trim().email("El email del destinatario no es válido"),
  destinatarioTelefono: opcional,
  calle: requerido("Falta la calle"),
  numeroCalle: requerido("Falta el número de la dirección"),
  piso: opcional,
  departamento: opcional,
  barrio: opcional,
  localidad: requerido("Falta la localidad"),
  provincia: z.string().regex(/^[A-Z]$/, "Elegí la provincia"),
  codigoPostal: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s/g, "").toUpperCase())
    .pipe(z.string().regex(/^[A-Z]?\d{4}[A-Z]{0,3}$/, "El código postal no es válido")),
});

export type EnvioInput = z.input<typeof envioSchema>;

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
  // Lo que le cuesta a Peliando el envio (no lo paga el cliente).
  costoEnvio: z.coerce.number().min(0, "El costo de envío no puede ser negativo").default(0),
  // Solo al crear: la venta se despacha por Correo Argentino a esta direccion.
  envio: envioSchema.optional(),
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
