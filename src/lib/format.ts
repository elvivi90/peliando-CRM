import { Prisma } from "@prisma/client";

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

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
