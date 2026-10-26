/**
 * Provincias con el codigo de una letra que usa Correo Argentino (tabla del
 * final del manual de MiCorreo). Aparte del cliente de Correo para poder
 * usarlo en componentes del navegador.
 */
export const PROVINCIAS: { codigo: string; nombre: string }[] = [
  { codigo: "C", nombre: "CABA" },
  { codigo: "B", nombre: "Buenos Aires" },
  { codigo: "K", nombre: "Catamarca" },
  { codigo: "H", nombre: "Chaco" },
  { codigo: "U", nombre: "Chubut" },
  { codigo: "X", nombre: "Córdoba" },
  { codigo: "W", nombre: "Corrientes" },
  { codigo: "E", nombre: "Entre Ríos" },
  { codigo: "P", nombre: "Formosa" },
  { codigo: "Y", nombre: "Jujuy" },
  { codigo: "L", nombre: "La Pampa" },
  { codigo: "F", nombre: "La Rioja" },
  { codigo: "M", nombre: "Mendoza" },
  { codigo: "N", nombre: "Misiones" },
  { codigo: "Q", nombre: "Neuquén" },
  { codigo: "R", nombre: "Río Negro" },
  { codigo: "A", nombre: "Salta" },
  { codigo: "J", nombre: "San Juan" },
  { codigo: "D", nombre: "San Luis" },
  { codigo: "Z", nombre: "Santa Cruz" },
  { codigo: "S", nombre: "Santa Fe" },
  { codigo: "G", nombre: "Santiago del Estero" },
  { codigo: "V", nombre: "Tierra del Fuego" },
  { codigo: "T", nombre: "Tucumán" },
];

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const PROVINCIA_POR_NOMBRE = new Map(PROVINCIAS.map((p) => [normalizar(p.nombre), p.codigo]));

/**
 * Codigo de una letra a partir del nombre que manda Tiendup ("Buenos Aires",
 * "Capital Federal", "Ciudad Autónoma de Buenos Aires", "Córdoba"...). Null
 * si no se reconoce.
 */
export function codigoProvincia(nombre: string | null | undefined): string | null {
  if (!nombre) return null;
  const n = normalizar(nombre).replace(/^provincia de /, "");
  if (
    n === "caba" ||
    n.includes("capital federal") ||
    n.includes("ciudad autonoma") ||
    n === "ciudad de buenos aires"
  ) {
    return "C";
  }
  if (n.startsWith("tierra del fuego")) return "V";
  return PROVINCIA_POR_NOMBRE.get(n) ?? null;
}

export function nombreProvincia(codigo: string) {
  return PROVINCIAS.find((p) => p.codigo === codigo)?.nombre ?? codigo;
}
