import { prisma } from "@/lib/prisma";

/**
 * Coordenadas de un lugar para el mapa de ventas (Reportes), con
 * Nominatim (OpenStreetMap). Cada consulta se busca una sola vez y queda en
 * la tabla Geocodificacion.
 *
 * Politica de uso de Nominatim (https://operations.osmfoundation.org/policies/nominatim/):
 * como mucho 1 consulta por segundo, User-Agent que identifique la app y
 * guardar los resultados en vez de repetir consultas. Por eso las busquedas
 * pendientes se hacen de a poco (ver geocodificarPendientes), nunca en el
 * camino de una pantalla.
 */

const USER_AGENT = "PeliandoCRM/1.0 (+https://github.com/elvivi90/peliando-CRM)";
const PAUSA_MS = 1100;

// Abreviaturas que se usan al cargar lugares y que Nominatim no entiende
// ("LP" terminaba en Constitucion).
const ABREVIATURAS: [RegExp, string][] = [
  [/\blp\b/g, "la plata"],
  [/\bmdp\b/g, "mar del plata"],
  [/\b(caba|capital federal)\b/g, "ciudad autónoma de buenos aires"],
];


// Misma consulta escrita distinto ("La Plata, Buenos Aires" / "la plata,
// buenos aires ") -> mismo registro. Todo se busca dentro de Argentina.
export function normalizarConsulta(texto: string) {
  let limpio = texto.trim().replace(/\s+/g, " ").toLowerCase();
  for (const [abreviatura, completo] of ABREVIATURAS) limpio = limpio.replace(abreviatura, completo);
  return /argentina/.test(limpio) ? limpio : `${limpio}, argentina`;
}

type ResultadoNominatim = {
  lat: string;
  lon: string;
  address?: Record<string, string | undefined>;
};

async function consultarNominatim(consulta: string, soloLocalidades: boolean) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.search = new URLSearchParams({
    q: consulta,
    format: "jsonv2",
    addressdetails: "1",
    limit: "1",
    countrycodes: "ar",
    "accept-language": "es",
    // Solo ciudades/localidades/barrios: si no, "Tres de Febrero, Buenos
    // Aires" encuentra una calle en Palermo en vez del partido.
    ...(soloLocalidades ? { featureType: "settlement" } : {}),
  }).toString();

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Nominatim respondio HTTP ${res.status}`);
  const [primero] = (await res.json()) as ResultadoNominatim[];
  return primero ?? null;
}

async function buscarEnNominatim(consulta: string) {
  // Primero como localidad; una direccion completa ("Entre Ríos 2246,
  // Martínez") recien se busca libre si asi no aparece.
  let resultado = await consultarNominatim(consulta, true);
  if (!resultado) {
    await new Promise((r) => setTimeout(r, PAUSA_MS));
    resultado = await consultarNominatim(consulta, false);
  }
  if (!resultado) return { lat: null, lng: null, localidad: null, provincia: null };

  const a = resultado.address ?? {};
  const esCaba = /aut[oó]noma/i.test(a.state ?? "");
  // En CABA el barrio dice mas que "Ciudad Autonoma de Buenos Aires".
  const localidad =
    (esCaba ? a.suburb : null) ??
    a.city ??
    a.town ??
    a.village ??
    a.municipality ??
    a.suburb ??
    a.state ??
    null;
  return {
    lat: Number(resultado.lat),
    lng: Number(resultado.lon),
    localidad: localidad?.replace(/^Municipio de /i, "") ?? null,
    provincia: a.state ?? null,
  };
}

/**
 * Busca las consultas que todavia no estan guardadas, de a una por segundo y
 * hasta `maximo` por llamada (el resto queda para la proxima). Pensado para
 * correr dentro de `after()` o en un script. Nunca tira: una consulta que
 * falla se reintenta la proxima vez.
 */
export async function geocodificarPendientes(consultas: string[], maximo = 20) {
  const unicas = [...new Set(consultas.map(normalizarConsulta))];
  if (unicas.length === 0) return 0;

  const guardadas = await prisma.geocodificacion.findMany({
    where: { consulta: { in: unicas } },
    select: { consulta: true },
  });
  const ya = new Set(guardadas.map((g) => g.consulta));
  const pendientes = unicas.filter((c) => !ya.has(c)).slice(0, maximo);

  let hechas = 0;
  for (const [i, consulta] of pendientes.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, PAUSA_MS));
    try {
      const resultado = await buscarEnNominatim(consulta);
      await prisma.geocodificacion.upsert({
        where: { consulta },
        update: resultado,
        create: { consulta, ...resultado },
      });
      hechas++;
    } catch (err) {
      console.error(`[geocoding] "${consulta}":`, err instanceof Error ? err.message : err);
    }
  }
  return hechas;
}
