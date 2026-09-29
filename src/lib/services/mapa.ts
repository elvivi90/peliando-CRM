import { prisma } from "@/lib/prisma";
import { normalizarConsulta } from "@/lib/services/geocoding";

export type Canal = "Tiendup" | "Eventos" | "Mayoristas" | "Minoristas";

export type PuntoMapa = {
  etiqueta: string;
  lat: number;
  lng: number;
  ventas: number;
  unidades: number;
  monto: number;
  porCanal: Partial<Record<Canal, { ventas: number; unidades: number }>>;
};

// "Flores (CABA)", "La Plata (Buenos Aires)", y sin repetir cuando la
// localidad es la misma provincia ("CABA", no "CABA (CABA)").
function etiquetaLugar(localidad: string, provincia: string | null) {
  const corto = (t: string) => t.replace(/ciudad aut[oó]noma de buenos aires/i, "CABA").trim();
  const loc = corto(localidad);
  const prov = provincia ? corto(provincia) : null;
  // Tiendup trae CABA escrito de varias formas ("Buenos Aires" en CABA, o
  // CABA en provincia de Buenos Aires): es la ciudad entera, sin barrio.
  if (loc === "CABA" || (loc === "Buenos Aires" && prov === "CABA")) return "CABA";
  return prov && prov !== loc ? `${loc} (${prov})` : loc;
}

/**
 * Ventas de un periodo agrupadas por localidad, para el mapa de Reportes.
 *
 * De donde sale la ubicacion de cada venta, en este orden:
 *   1. Tiendup con envio a domicilio: ciudad y provincia de envio
 *      (Venta.envioLocalidad / envioProvincia, las guarda el webhook).
 *   2. Venta de un evento: el lugar del evento.
 *   3. Venta a un cliente con direccion cargada: esa direccion.
 * Si no hay ninguna (venta rapida sin evento, retiro en sucursal de
 * Tiendup), la venta se cuenta en `sinUbicacion`.
 *
 * Las coordenadas salen de la tabla Geocodificacion. Las consultas que
 * todavia no estan ahi vuelven en `pendientes` para buscarlas en segundo
 * plano (geocodificarPendientes); mientras tanto esas ventas se cuentan en
 * `sinUbicacion` como "buscando".
 */
export async function getMapaVentas(inicio: Date, fin: Date) {
  const ventas = await prisma.venta.findMany({
    where: { fecha: { gte: inicio, lte: fin } },
    include: { evento: true, cliente: true },
  });

  const conConsulta = ventas.map((v) => {
    const canal: Canal =
      v.origen === "WEBHOOK_TIENDUP"
        ? "Tiendup"
        : v.eventoId
          ? "Eventos"
          : v.tipo === "MINORISTA"
            ? "Minoristas"
            : "Mayoristas";

    let consulta: string | null = null;
    // Etiqueta conocida de antemano (Tiendup ya trae la localidad); si no,
    // la pone el resultado de la busqueda.
    let etiqueta: string | null = null;
    if (v.envioLocalidad) {
      consulta = [v.envioLocalidad, v.envioProvincia].filter(Boolean).join(", ");
      etiqueta = etiquetaLugar(v.envioLocalidad, v.envioProvincia);
    } else if (v.evento?.lugar) {
      consulta = v.evento.lugar;
    } else if (v.cliente?.direccion) {
      consulta = v.cliente.direccion;
    }
    return { venta: v, canal, consulta: consulta ? normalizarConsulta(consulta) : null, etiqueta };
  });

  const consultas = [...new Set(conConsulta.flatMap((c) => (c.consulta ? [c.consulta] : [])))];
  const geos = await prisma.geocodificacion.findMany({ where: { consulta: { in: consultas } } });
  const porConsulta = new Map(geos.map((g) => [g.consulta, g]));

  const grupos = new Map<string, PuntoMapa & { sumaLat: number; sumaLng: number }>();
  const sinUbicacion = { total: 0, retiroEnSucursal: 0, sinDatos: 0, noEncontradas: 0, buscando: 0 };
  const pendientes = new Set<string>();

  for (const { venta: v, canal, consulta, etiqueta } of conConsulta) {
    if (!consulta) {
      sinUbicacion.total++;
      if (v.origen === "WEBHOOK_TIENDUP") sinUbicacion.retiroEnSucursal++;
      else sinUbicacion.sinDatos++;
      continue;
    }
    const geo = porConsulta.get(consulta);
    if (!geo) {
      pendientes.add(consulta);
      sinUbicacion.total++;
      sinUbicacion.buscando++;
      continue;
    }
    if (geo.lat === null || geo.lng === null) {
      sinUbicacion.total++;
      sinUbicacion.noEncontradas++;
      continue;
    }

    const clave = etiqueta ?? (geo.localidad ? etiquetaLugar(geo.localidad, geo.provincia) : consulta);
    const g = grupos.get(clave) ?? {
      etiqueta: clave,
      lat: 0,
      lng: 0,
      sumaLat: 0,
      sumaLng: 0,
      ventas: 0,
      unidades: 0,
      monto: 0,
      porCanal: {},
    };
    g.sumaLat += geo.lat;
    g.sumaLng += geo.lng;
    g.ventas++;
    g.unidades += v.cantidad;
    g.monto += v.precioTotal.toNumber();
    const c = (g.porCanal[canal] ??= { ventas: 0, unidades: 0 });
    c.ventas++;
    c.unidades += v.cantidad;
    grupos.set(clave, g);
  }

  // Varias direcciones de una misma localidad: el circulo va en el promedio.
  const puntos: PuntoMapa[] = [...grupos.values()]
    .map(({ sumaLat, sumaLng, ...g }) => ({ ...g, lat: sumaLat / g.ventas, lng: sumaLng / g.ventas }))
    .sort((a, b) => b.unidades - a.unidades);

  return { puntos, sinUbicacion, totalVentas: ventas.length, pendientes: [...pendientes] };
}
