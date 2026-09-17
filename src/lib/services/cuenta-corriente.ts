import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Resume la cuenta corriente de un cliente mayorista/distribuidor (seccion
 * 4.2): cantidad vendida y no entregada, y plata vendida y no cobrada.
 * Es una capa de consulta sobre Venta, no una entidad persistida aparte.
 */
export async function getCuentaCorriente(clienteId: string) {
  const ventas = await prisma.venta.findMany({
    where: { clienteId },
    orderBy: { fecha: "desc" },
    include: { producto: true, evento: true },
  });

  let cantidadPendienteEntrega = 0;
  let saldoPendienteCobro = new Prisma.Decimal(0);

  for (const v of ventas) {
    cantidadPendienteEntrega += v.cantidad - v.cantidadEntregada;
    saldoPendienteCobro = saldoPendienteCobro.plus(v.precioTotal.minus(v.montoCobrado));
  }

  return { ventas, cantidadPendienteEntrega, saldoPendienteCobro };
}

export async function resumenCuentasCorrientesPendientes() {
  const ventas = await prisma.venta.findMany({
    where: { cliente: { tipo: { in: ["MAYORISTA", "DISTRIBUIDOR"] } } },
    include: { cliente: true },
  });

  const porCliente = new Map<
    string,
    { cliente: (typeof ventas)[number]["cliente"]; cantidadPendiente: number; saldoPendiente: Prisma.Decimal }
  >();

  for (const v of ventas) {
    const actual = porCliente.get(v.clienteId) ?? {
      cliente: v.cliente,
      cantidadPendiente: 0,
      saldoPendiente: new Prisma.Decimal(0),
    };
    actual.cantidadPendiente += v.cantidad - v.cantidadEntregada;
    actual.saldoPendiente = actual.saldoPendiente.plus(v.precioTotal.minus(v.montoCobrado));
    porCliente.set(v.clienteId, actual);
  }

  return [...porCliente.values()]
    .filter((c) => c.cantidadPendiente > 0 || c.saldoPendiente.gt(0))
    .sort((a, b) => b.saldoPendiente.comparedTo(a.saldoPendiente));
}
