import { prisma } from "@/lib/prisma";
import { envioCompletado, type TiendupOrder } from "@/lib/services/tiendup";
import { correoConfigurado } from "@/lib/services/correo-argentino";
import { datosEnvioTiendup } from "@/lib/services/envios";
import { descontarStockTiendup } from "@/lib/services/concesion";

/**
 * Ordenes de Tiendup pagadas por transferencia. Tiendup las marca como
 * pagadas (evento orders.payment_paid) recien cuando el equipo confirma el
 * pago a mano en el panel, asi que el webhook crea la venta antes, con
 * orders.creation, como pagoPendiente: sin cobro, sin descontar stock y sin
 * envio. Al confirmarse el pago (webhook o, de respaldo, el cron
 * entregas-tiendup) pasa a ser una venta normal; si la orden se cancela, se
 * borra.
 *
 * Valores relevados de las ordenes reales: gateway.name "Transferencia
 * bancaria" | "Mercadopago"; payment_status "paid" | "pending" | "rejected";
 * status "open" | "closed" | "cancelled".
 */

export function esTransferencia(order: Pick<TiendupOrder, "gateway">) {
  return /transferencia/i.test(order.gateway?.name ?? "");
}

export function ordenPagada(order: Pick<TiendupOrder, "payment_status">) {
  return order.payment_status === "paid";
}

export function ordenCancelada(order: Pick<TiendupOrder, "status">) {
  return order.status === "cancelled";
}

// Sucursal donde el cliente eligio retirar (null si es envio o no aplica).
export function sucursalDeRetiro(order: Pick<TiendupOrder, "shipping">) {
  return order.shipping?.type === "branch_pickup" ? (order.shipping.branch?.name ?? null) : null;
}

export function urlOrdenTiendup(hash: string) {
  return `https://mi.tiendup.com/orders/details/${hash}`;
}

/**
 * Pasa una venta pagoPendiente a confirmada: cobro completo, stock
 * descontado, entrega si la orden ya no lleva envio pendiente y alta del
 * envio en Correo (devuelve su id: el alta en Correo la hace el que llama,
 * fuera de la transaccion). El updateMany con pagoPendiente: true hace que
 * el webhook y el cron no la confirmen dos veces si coinciden. Devuelve null
 * si la venta ya no estaba pendiente.
 */
export async function confirmarPagoTiendup(ventaId: string, order: TiendupOrder) {
  const entregada = envioCompletado(order);
  const datosEnvio = correoConfigurado() && !entregada ? datosEnvioTiendup(order) : null;

  return prisma.$transaction(async (tx) => {
    const venta = await tx.venta.findUnique({ where: { id: ventaId } });
    if (!venta) return null;

    const { count } = await tx.venta.updateMany({
      where: { id: ventaId, pagoPendiente: true },
      data: {
        pagoPendiente: false,
        montoCobrado: venta.precioTotal,
        cantidadEntregada: entregada ? venta.cantidad : 0,
      },
    });
    if (count === 0) return null;

    if (entregada) {
      await tx.entrega.create({ data: { ventaId, cantidad: venta.cantidad } });
    }
    const envio = datosEnvio ? await tx.envio.create({ data: { ventaId, ...datosEnvio } }) : null;
    await descontarStockTiendup(tx, venta, sucursalDeRetiro(order));

    return { envioId: envio?.id ?? null };
  });
}

/**
 * Borra la venta pagoPendiente de una orden cancelada en Tiendup. No toca el
 * stock: nunca se desconto. Devuelve false si ya no estaba pendiente (por
 * ejemplo, se confirmo y despues se cancelo: esa se maneja a mano).
 */
export async function borrarTransferenciaCancelada(ventaId: string) {
  const { count } = await prisma.venta.deleteMany({ where: { id: ventaId, pagoPendiente: true } });
  return count > 0;
}
