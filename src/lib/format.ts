import { Prisma } from "@prisma/client";

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

// Formas de pago de una venta manual (enum FormaPago), en el orden del desplegable.
export const FORMA_PAGO_LABEL = {
  POSNET: "Posnet",
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
} as const;

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatMoney(value: Prisma.Decimal | number | string | null | undefined) {
  if (value === null || value === undefined) return currencyFormatter.format(0);
  return currencyFormatter.format(Number(value));
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return dateFormatter.format(new Date(value));
}

const fechaHoraArgentina = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const fechaArgentina = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/**
 * Fecha y hora de una venta en hora de Argentina ("05/11/2026 22:22"). Las
 * ventas sin hora conocida (medianoche exacta, ver partesArgentina) muestran
 * solo el dia.
 */
export function formatFechaHora(value: Date | string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  const sinHora = (d.getTime() - 3 * 60 * 60 * 1000) % 86_400_000 === 0;
  return (sinHora ? fechaArgentina : fechaHoraArgentina).format(d).replace(",", "");
}

const horaArgentina = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * Lo mismo que formatFechaHora pero por separado, para mostrar la hora en
 * una linea aparte ("05/11/2026" y "22:22"). Hora null si no se conoce.
 */
export function fechaYHora(value: Date | string) {
  const d = new Date(value);
  const sinHora = (d.getTime() - 3 * 60 * 60 * 1000) % 86_400_000 === 0;
  return { fecha: fechaArgentina.format(d), hora: sinHora ? null : horaArgentina.format(d) };
}

export function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

// Acepta "@usuario", "usuario" o el link del perfil
// ("https://www.instagram.com/usuario/?hl=es") y devuelve "usuario", o null
// si no es un usuario valido de Instagram (letras, numeros, punto y guion
// bajo, hasta 30).
export function normalizarInstagram(valor: string | null | undefined) {
  const texto = (valor ?? "").trim();
  if (!texto) return null;
  const delLink = texto.match(/instagram\.com\/([^/?#\s]+)/i);
  const usuario = (delLink ? delLink[1] : texto).replace(/^@/, "").toLowerCase();
  return /^[a-z0-9._]{1,30}$/.test(usuario) ? usuario : null;
}

// En el celular abre la app de Instagram en el perfil; en la compu, la web.
export function linkInstagram(usuario: string) {
  return `https://www.instagram.com/${usuario}/`;
}

type NombreCliente = { nombre: string; apellido: string; nombreNegocio?: string | null };

// Como se muestra un cliente: el negocio si lo tiene (mayoristas y
// distribuidores), si no la persona. Las ventas rapidas no tienen cliente.
export function nombreCliente(cliente: NombreCliente | null | undefined) {
  if (!cliente) return "Venta rápida";
  return cliente.nombreNegocio?.trim() || contactoCliente(cliente);
}

// La persona: el contacto en un mayorista/distribuidor, el cliente en un minorista.
export function contactoCliente(cliente: NombreCliente) {
  return `${cliente.nombre} ${cliente.apellido}`.trim();
}
