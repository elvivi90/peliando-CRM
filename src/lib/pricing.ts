import { Prisma, TipoVenta } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const DESCUENTO_DISTRIBUIDOR = 0.2;

export class PricingError extends Error {}

/**
 * Devuelve el tramo cuyo cantidad_desde es el mayor que sea <= cantidad
 * (el tramo "correspondiente" a esa cantidad). Null si la cantidad es
 * menor al primer escalon de la lista.
 */
export function elegirTramo<T extends { cantidadDesde: number }>(
  tramos: T[],
  cantidad: number,
): T | null {
  const aplicables = tramos
    .filter((t) => t.cantidadDesde <= cantidad)
    .sort((a, b) => b.cantidadDesde - a.cantidadDesde);
  return aplicables[0] ?? null;
}

export async function getListaActiva() {
  const lista = await prisma.listaDePrecios.findFirst({
    where: { estado: "ACTIVA" },
    include: { tramos: { orderBy: { cantidadDesde: "asc" } } },
  });
  if (!lista) {
    throw new PricingError(
      "No hay ninguna lista de precios activa. Creá una en la seccion Precios antes de cargar ventas.",
    );
  }
  return lista;
}

export type TramoLista = {
  id: string;
  cantidadDesde: number;
  precioUnitario: Prisma.Decimal;
};

type SugerenciaPrecio = {
  listaId: string;
  listaNombre: string;
  // todos los tramos de la lista usada (para poder elegir otro a mano)
  tramos: TramoLista[];
  tramoId: string | null;
  // cantidad_desde del tramo aplicado (null si no hubo tramo: PVP o precio particular)
  tramoDesde: number | null;
  precioUnitario: Prisma.Decimal;
  precioTotal: Prisma.Decimal;
};

/** Precio unitario que paga cada tipo por un tramo (el distribuidor paga tramo - 20%). */
export function precioDeTramo(tipo: TipoVenta, tramo: { precioUnitario: Prisma.Decimal }) {
  return tipo === "DISTRIBUIDOR"
    ? tramo.precioUnitario.mul(1 - DESCUENTO_DISTRIBUIDOR)
    : tramo.precioUnitario;
}

/**
 * Calcula el precio sugerido segun las reglas de la seccion 3.2. El
 * resultado es solo una sugerencia editable, excepto para Distribuidor
 * donde la formula es obligatoria (ver spec: "SIEMPRE se calcula...").
 */
export async function sugerirPrecio(params: {
  tipo: TipoVenta;
  cantidad: number;
  clientePrecioParticular?: Prisma.Decimal | null;
  clienteListaPrecioId?: string | null;
  // Tramo elegido a mano (mayorista/distribuidor). Si no viene, se elige
  // automaticamente el que corresponde a la cantidad.
  tramoId?: string | null;
}): Promise<SugerenciaPrecio> {
  const { tipo, cantidad, clientePrecioParticular, clienteListaPrecioId, tramoId } = params;

  const lista = clienteListaPrecioId
    ? await prisma.listaDePrecios.findUniqueOrThrow({
        where: { id: clienteListaPrecioId },
        include: { tramos: { orderBy: { cantidadDesde: "asc" } } },
      })
    : await getListaActiva();

  const base = { listaId: lista.id, listaNombre: lista.nombre, tramos: lista.tramos };

  if (tipo === "MINORISTA") {
    return {
      ...base,
      tramoId: null,
      tramoDesde: null,
      precioUnitario: lista.pvp,
      precioTotal: lista.pvp.mul(cantidad),
    };
  }

  if (tipo === "MAYORISTA" || tipo === "DISTRIBUIDOR") {
    // Un tramo elegido a mano tiene prioridad, incluso sobre el precio particular.
    if (tipo === "MAYORISTA" && clientePrecioParticular && !tramoId) {
      return {
        ...base,
        tramoId: null,
        tramoDesde: null,
        precioUnitario: clientePrecioParticular,
        precioTotal: clientePrecioParticular.mul(cantidad),
      };
    }

    const tramo = tramoId
      ? lista.tramos.find((t) => t.id === tramoId)
      : elegirTramo(lista.tramos, cantidad);
    if (tramoId && !tramo) {
      throw new PricingError("El tramo elegido no pertenece a la lista de precios de este cliente.");
    }
    if (!tramo) {
      throw new PricingError(
        `La cantidad (${cantidad}) es menor al primer tramo de la lista activa.`,
      );
    }

    const precioUnitario = precioDeTramo(tipo, tramo);
    return {
      ...base,
      tramoId: tramo.id,
      tramoDesde: tramo.cantidadDesde,
      precioUnitario,
      precioTotal: precioUnitario.mul(cantidad),
    };
  }

  throw new PricingError(`Tipo de venta "${tipo}" no admite calculo automatico de precio.`);
}
