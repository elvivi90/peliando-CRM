/**
 * Cliente de Mercado Pago, SOLO LECTURA: consulta los pagos recibidos para
 * saber cuanto cobro realmente Peliando por cada venta de Tiendup (comision,
 * financiacion de cuotas, neto) y cuando se libera la plata. El CRM no crea
 * cobros: este modulo expone unicamente GET a proposito.
 *
 * Se usa la API de Payments (/v1/payments/search) y no la de Orders: Tiendup
 * cobra con Checkout Pro, y esos pagos no existen como ordenes de la API de
 * Orders. Ver scripts/consultar-mercadopago.mjs para relevar pagos reales.
 *
 * Variable de entorno: MERCADOPAGO_ACCESS_TOKEN, el Access Token de
 * produccion de la cuenta que tiene conectada Tiendup.
 */

const BASE_URL = "https://api.mercadopago.com";
const TIMEOUT_MS = 15000;

function accessToken() {
  return process.env.MERCADOPAGO_ACCESS_TOKEN || null;
}

export function mercadoPagoConfigurado() {
  return accessToken() !== null;
}

export class MercadoPagoError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function errorDeRespuesta(json: unknown, status: number) {
  const j = (json ?? {}) as { message?: string };
  return new MercadoPagoError(
    j.message ? `Mercado Pago: ${j.message}` : `Mercado Pago respondió HTTP ${status}`,
    status,
  );
}

// La documentacion pide reintentar los 429 (esperando Retry-After) y los
// 500. Son todos GET, asi que repetir no cambia nada.
const ESPERAS_MS = [1000, 3000];

async function get<T>(ruta: string, params?: Record<string, string | number | undefined>) {
  const token = accessToken();
  if (!token) throw new MercadoPagoError("Falta configurar MERCADOPAGO_ACCESS_TOKEN.", 0);

  const url = new URL(ruta, BASE_URL);
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }

  for (let intento = 0; ; intento++) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const json = await res.json().catch(() => null);
    if (res.ok) return json as T;

    const reintentable = res.status === 429 || res.status >= 500;
    if (!reintentable || intento >= ESPERAS_MS.length) throw errorDeRespuesta(json, res.status);
    const retryAfter = Number(res.headers.get("retry-after"));
    await new Promise((r) =>
      setTimeout(r, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : ESPERAS_MS[intento]),
    );
  }
}

export type Pago = {
  id: number;
  // approved, rejected, refunded, charged_back, in_mediation, ...
  status: string;
  status_detail: string;
  // Las ventas de Tiendup son "regular_payment"; las transferencias
  // (money_transfer, account_fund) y los movimientos a reservas
  // (partition_transfer) o inversiones no son ventas.
  operation_type: string;
  external_reference: string | null;
  transaction_amount: number;
  installments: number;
  // credit_card, debit_card, account_money
  payment_type_id: string;
  // visa, master, naranja, debvisa, account_money, ...
  payment_method_id: string;
  date_created: string;
  date_approved: string | null;
  // Cuando la plata queda disponible para usar. En la cuenta de Peliando es
  // siempre 35 dias despues de aprobado, para cualquier medio y cuotas: es el
  // plazo de acreditacion elegido en la cuenta.
  money_release_date: string | null;
  // Lo que acredita Mercado Pago. Puede ser menos que el monto menos
  // fee_details (se vio un pago con 5% de descuento extra que no figura en
  // ninguna comision, probablemente una retencion).
  transaction_details?: { net_received_amount?: number };
  // mercadopago_fee (1,89% en cualquier medio) y, en cuotas, financing_fee.
  fee_details?: { type: string; amount: number; fee_payer: string }[];
};

// Tope de la API: 50 por pagina.
const PAGOS_POR_PAGINA = 50;

// Id de la cuenta duena del token, para la busqueda (ver buscarPagos). No
// cambia: se pide una vez por instancia.
let collectorId: number | null = null;

async function obtenerCollectorId() {
  collectorId ??= (await get<{ id: number }>("/users/me")).id;
  return collectorId;
}

/**
 * Pagos recibidos entre `desde` y `hasta`, del mas viejo al mas nuevo.
 * `rango` elige por que fecha se filtra: date_last_updated trae tambien los
 * pagos viejos que cambiaron hace poco (una devolucion, un contracargo).
 * Sin collector.id la busqueda mezcla los pagos que HIZO la cuenta (probado
 * con la cuenta real: 100 resultados en vez de 79 recibidos).
 */
export async function buscarPagos(params: {
  desde: Date;
  hasta: Date;
  rango: "date_created" | "date_last_updated";
  offset?: number;
}) {
  const res = await get<{ results?: Pago[]; paging?: { total?: number } }>("/v1/payments/search", {
    "collector.id": await obtenerCollectorId(),
    range: params.rango,
    begin_date: params.desde.toISOString(),
    end_date: params.hasta.toISOString(),
    sort: params.rango,
    criteria: "asc",
    limit: PAGOS_POR_PAGINA,
    offset: params.offset ?? 0,
  });
  const pagos = res.results ?? [];
  return {
    pagos,
    total: res.paging?.total ?? pagos.length,
    siguienteOffset: (params.offset ?? 0) + pagos.length,
  };
}

/**
 * Id de la orden de Tiendup de un pago de su checkout. Tiendup manda el
 * external_reference como "{business_id}-{?}-{order_id}-{?}", por ejemplo
 * "81394-25993-5634992-1" para la orden 5634992 (#83). El order_id es el
 * mismo que guarda Venta.tiendupOrderId.
 */
export function tiendupOrderIdDePago(pago: Pick<Pago, "external_reference">) {
  const m = pago.external_reference?.match(/^\d+-\d+-(\d+)-\d+$/);
  return m ? Number(m[1]) : null;
}
