import { cache } from "react";
import { fetchTiendupOrder } from "@/lib/services/tiendup";

/**
 * Orden de Tiendup para el detalle de la venta, consultada en vivo una sola
 * vez por pedido aunque la usen varios bloques (pago y envio). Devuelve null
 * si Tiendup tarda o falla: los bloques muestran lo que tiene el CRM.
 */
export const ordenTiendupDeVenta = cache(async (orderId: number) => {
  try {
    return await fetchTiendupOrder(orderId, { timeoutMs: 8000 });
  } catch (err) {
    console.error(`[tiendup] orden #${orderId} para el detalle de la venta:`, err);
    return null;
  }
});
