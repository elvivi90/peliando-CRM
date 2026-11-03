import { z } from "zod";
import { parseFechaInput } from "@/lib/date";

const opcional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : null));
const requerido = (mensaje: string) => z.string().trim().min(1, mensaje);

const sinAcentos = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Localidades del partido de La Plata (sin acentos, en minuscula). Tienen
// que coincidir con la localidad completa. Las que se repiten en otro lado
// (San Carlos, Abasto, Hernandez) no estan: se reconocen por el codigo postal.
const LOCALIDADES_LA_PLATA = new Set([
  "tolosa",
  "ringuelet",
  "gonnet",
  "manuel b. gonnet",
  "manuel b gonnet",
  "city bell",
  "villa elisa",
  "gorina",
  "joaquin gorina",
  "arturo segui",
  "los hornos",
  "villa elvira",
  "altos de san lorenzo",
  "melchor romero",
  "lisandro olmos",
  "etcheverry",
  "angel etcheverry",
  "el peligro",
  "villa garibaldi",
  "transradio",
  "ignacio correas",
]);
// 1894 Villa Elisa, 1895 Arturo Segui, 1896 City Bell / Gorina, 1897
// Gonnet, 1900-1903 La Plata, Tolosa, Ringuelet, Los Hornos, Olmos, Romero
// y Abasto.
const CP_LA_PLATA = new Set(["1894", "1895", "1896", "1897", "1900", "1901", "1902", "1903"]);

/**
 * Las entregas en el partido de La Plata las hace el equipo (envio propio
 * o retiro): no van por Correo Argentino ni generan etiqueta. Se reconoce
 * por la localidad, el codigo postal (con o sin la letra de provincia) o el
 * nombre del metodo de envio de Tiendup ("Envío en La Plata").
 */
export function esEntregaEnLaPlata(d: {
  localidad?: string | null;
  codigoPostal?: string | null;
  metodo?: string | null;
}) {
  const cp = d.codigoPostal?.match(/\d{4}/)?.[0];
  const localidad = sinAcentos(d.localidad ?? "").replace(/\s+/g, " ").trim();
  return (
    (cp !== undefined && CP_LA_PLATA.has(cp)) ||
    /\bla plata\b/.test(localidad) ||
    LOCALIDADES_LA_PLATA.has(localidad) ||
    /\bla plata\b/.test(sinAcentos(d.metodo ?? ""))
  );
}

export const MENSAJE_ENVIO_LA_PLATA =
  "Las entregas en La Plata no van por Correo Argentino: cargá la venta sin envío.";

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
  // Vacio = sin especificar.
  formaPago: z
    .enum(["POSNET", "EFECTIVO", "TRANSFERENCIA", ""])
    .optional()
    .transform((v) => (v ? v : null)),
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
