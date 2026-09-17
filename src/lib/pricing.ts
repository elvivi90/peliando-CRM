import { Prisma, TipoVenta } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DESCUENTO_DISTRIBUIDOR = 0.2;

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

type SugerenciaPrecio = {
  listaId: string;
  tramoId: string | null;
  precioUnitario: Prisma.Decimal;
  precioTotal: Prisma.Decimal;
};

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
}): Promise<SugerenciaPrecio> {
  const { tipo, cantidad, clientePrecioParticular, clienteListaPrecioId } = params;

  const lista = clienteListaPrecioId
    ? await prisma.listaDePrecios.findUniqueOrThrow({
        where: { id: clienteListaPrecioId },
        include: { tramos: { orderBy: { cantidadDesde: "asc" } } },
      })
    : await getListaActiva();

  if (tipo === "MINORISTA") {
    return {
      listaId: lista.id,
      tramoId: null,
      precioUnitario: lista.pvp,
      precioTotal: lista.pvp.mul(cantidad),
    };
  }

  if (tipo === "MAYORISTA") {
    if (clientePrecioParticular) {
      return {
        listaId: lista.id,
        tramoId: null,
        precioUnitario: clientePrecioParticular,
        precioTotal: clientePrecioParticular.mul(cantidad),
      };
    }
    const tramo = elegirTramo(lista.tramos, cantidad);
    if (!tramo) {
      throw new PricingError(
        `La cantidad (${cantidad}) es menor al primer tramo de la lista activa.`,
      );
    }
    return {
      listaId: lista.id,
      tramoId: tramo.id,
      precioUnitario: tramo.precioUnitario,
      precioTotal: tramo.precioUnitario.mul(cantidad),
    };
  }

  if (tipo === "DISTRIBUIDOR") {
    const tramo = elegirTramo(lista.tramos, cantidad);
    if (!tramo) {
      throw new PricingError(
        `La cantidad (${cantidad}) es menor al primer tramo de la lista activa.`,
      );
    }
    const precioUnitario = tramo.precioUnitario.mul(1 - DESCUENTO_DISTRIBUIDOR);
    return {
      listaId: lista.id,
      tramoId: tramo.id,
      precioUnitario,
      precioTotal: precioUnitario.mul(cantidad),
    };
  }

  throw new PricingError(`Tipo de venta "${tipo}" no admite calculo automatico de precio.`);
}
