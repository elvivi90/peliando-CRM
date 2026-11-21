import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Lo que la concesion todavia tiene en el local: entregado menos lo que
// vendio el concesionario (liquidado), lo que devolvio y lo que retiraron
// ahi clientes de Tiendup.
export function saldoConcesion(concesion: {
  cantidadEntregada: number;
  liquidaciones: { cantidadVendida: number }[];
  devoluciones: { cantidad: number }[];
  retiros: { cantidad: number }[];
}) {
  const liquidado = concesion.liquidaciones.reduce((s, l) => s + l.cantidadVendida, 0);
  const devuelto = concesion.devoluciones.reduce((s, d) => s + d.cantidad, 0);
  const retirado = concesion.retiros.reduce((s, r) => s + r.cantidad, 0);
  return concesion.cantidadEntregada - liquidado - devuelto - retirado;
}

export const INCLUDE_SALDO = { liquidaciones: true, devoluciones: true, retiros: true } as const;

export async function getConcesionesConSaldo() {
  const concesiones = await prisma.concesion.findMany({
    include: {
      cliente: true,
      producto: true,
      ...INCLUDE_SALDO,
      retiros: { include: { venta: { select: { id: true, descripcion: true } } } },
    },
    orderBy: { fechaEntrega: "desc" },
  });

  return concesiones.map((c) => ({ ...c, saldo: saldoConcesion(c) }));
}

/**
 * Descuenta el stock de una venta de Tiendup ya pagada. Si el cliente
 * eligio retirar en el local de un concesionario (Cliente.sucursalTiendup),
 * la caja sale de su concesion: se registra un RetiroConcesion contra las
 * concesiones de ese producto con saldo, de la mas vieja a la mas nueva. Lo
 * que no alcance a cubrir la concesion (o cualquier otro retiro o envio)
 * sale del stock del producto, como siempre.
 */
export async function descontarStockTiendup(
  tx: Prisma.TransactionClient,
  venta: { id: string; productoId: string; cantidad: number },
  sucursal: string | null | undefined,
) {
  let restante = venta.cantidad;

  const nombreSucursal = sucursal?.trim();
  const concesionario = nombreSucursal
    ? await tx.cliente.findFirst({
        where: { sucursalTiendup: { equals: nombreSucursal, mode: "insensitive" } },
      })
    : null;

  if (concesionario) {
    const concesiones = await tx.concesion.findMany({
      where: { clienteId: concesionario.id, productoId: venta.productoId },
      include: INCLUDE_SALDO,
      orderBy: { fechaEntrega: "asc" },
    });
    for (const c of concesiones) {
      const tomar = Math.min(restante, saldoConcesion(c));
      if (tomar <= 0) continue;
      await tx.retiroConcesion.create({
        data: { concesionId: c.id, ventaId: venta.id, cantidad: tomar },
      });
      restante -= tomar;
      if (restante === 0) break;
    }
    if (restante > 0) {
      console.warn(
        `[concesion] la venta ${venta.id} se retira en "${nombreSucursal}" pero a la concesion ` +
          `le faltan ${restante} u.: salen del stock del producto.`,
      );
    }
  }

  if (restante > 0) {
    await tx.producto.update({
      where: { id: venta.productoId },
      data: { stockActual: { decrement: restante } },
    });
  }
}

/** Unidades de la venta que salieron de una concesion y no del stock. */
export function cantidadDesdeConcesion(venta: { retirosConcesion: { cantidad: number }[] }) {
  return venta.retirosConcesion.reduce((s, r) => s + r.cantidad, 0);
}
