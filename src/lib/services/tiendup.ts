/**
 * Cliente minimo de la API publica de Tiendup (GET /orders/{order_id},
 * autenticado con X-API-Key). Lo usan el webhook (para crear la venta) y el
 * detalle de la venta (para mostrar la orden en vivo: el estado del envio y
 * el codigo de seguimiento cambian despues del pago, asi que no se guarda
 * una copia).
 *
 * El schema publicado es "parcial": todos los campos que no usa el webhook
 * se tipan como opcionales. Relevado de ordenes reales (ver
 * https://public-api.tiendup.com/openapi/orders).
 */

const BUSINESS_SLUG = process.env.TIENDUP_BUSINESS_SLUG || "peliando";

export type TiendupOrderItem = {
  product_id?: number;
  name?: string;
  ecommerce_type?: string;
  quantity?: number;
  unit_price?: string;
  price?: string;
  sku?: string | null;
};

export type TiendupAddress = {
  street?: string | null;
  number?: string | null;
  floor?: string | null;
  city?: string | null;
  zip_code?: string | null;
  state?: string | null;
  observations?: string | null;
};

export type TiendupOrder = {
  id: number;
  hash: string;
  number?: string;
  // "open" | "closed"
  status?: string;
  // "paid", ...
  payment_status?: string;
  payment_confirmation_date?: string | null;
  creation_date: string;
  currency?: string;
  total_amount: string;
  total_items_price?: string;
  discount?: string;
  promo_code?: string | null;
  note?: string | null;
  items: TiendupOrderItem[];
  customer: {
    email: string;
    name?: string;
    last_name?: string;
    phone?: string | null;
  };
  gateway?: { name?: string | null } | null;
  shipping?: {
    // "shipped" | "unshipped" | vacio si no aplica
    status?: string | null;
    // "ship" | "branch_pickup" | "none"
    type?: string | null;
    // "Envío" | "Retira en sucursal" | "No aplica" (ya viene en castellano)
    type_display_name?: string | null;
    // Metodo o sucursal: "Correo Argentino Estándar", "La plata"
    name?: string | null;
    tracking_code?: string | null;
    recipient_name?: string | null;
    recipient_phone?: string | null;
    cost_customer?: string | null;
    address?: TiendupAddress | null;
    observations?: string | null;
  } | null;
};

export async function fetchTiendupOrder(
  orderId: number,
  opciones: { timeoutMs?: number } = {},
): Promise<TiendupOrder> {
  const apiKey = process.env.TIENDUP_API_KEY;
  if (!apiKey) throw new Error("Falta configurar TIENDUP_API_KEY");

  const res = await fetch(`https://${BUSINESS_SLUG}.public-api.tiendup.com/orders/${orderId}`, {
    headers: { "X-API-Key": apiKey },
    cache: "no-store",
    signal: opciones.timeoutMs ? AbortSignal.timeout(opciones.timeoutMs) : undefined,
  });

  if (!res.ok) {
    throw new Error(`No se pudo obtener la orden #${orderId} de Tiendup (HTTP ${res.status})`);
  }

  const json = await res.json();
  return json.data as TiendupOrder;
}
