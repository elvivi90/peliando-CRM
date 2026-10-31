import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buscarPagos, tiendupOrderIdDePago, type Pago } from "@/lib/services/mercado-pago";

/**
 * Copia a PagoMercadoPago los pagos del checkout de Tiendup que Mercado Pago
 * informa entre `desde` y `hasta`, unidos a su venta por la orden de Tiendup
 * (ver tiendupOrderIdDePago). Es idempotente: un pago ya guardado se
 * actualiza (estado, neto, liberacion), no se duplica.
 *
 * Se saltean los pagos que nunca se aprobaron (los rechazos de un comprador
 * que reintenta con otra tarjeta comparten la misma orden) y los que no son
 * de Tiendup (transferencias, reservas, links de pago sueltos).
 */
export async function sincronizarPagos(params: {
  desde: Date;
  hasta: Date;
  rango: "date_created" | "date_last_updated";
}) {
  let revisados = 0;
  let guardados = 0;
  // Ordenes de Tiendup con pago aprobado y sin venta en el CRM (el webhook
  // todavia no llego o fallo): se vuelven a buscar en la proxima corrida.
  const sinVenta: number[] = [];

  for (let offset = 0; ; ) {
    const res = await buscarPagos({ ...params, offset });
    for (const pago of res.pagos) {
      revisados++;
      const resultado = await guardarPago(pago);
      if (resultado === "guardado") guardados++;
      if (typeof resultado === "number") sinVenta.push(resultado);
    }
    if (res.pagos.length === 0 || res.siguienteOffset >= res.total) break;
    offset = res.siguienteOffset;
  }

  return { revisados, guardados, sinVenta };
}

async function guardarPago(pago: Pago): Promise<"guardado" | "salteado" | number> {
  if (pago.operation_type !== "regular_payment" || !pago.date_approved) return "salteado";
  const orderId = tiendupOrderIdDePago(pago);
  if (orderId === null) return "salteado";

  const venta = await prisma.venta.findUnique({ where: { tiendupOrderId: orderId }, select: { id: true } });
  if (!venta) return orderId;

  const fee = (tipo: string) =>
    (pago.fee_details ?? [])
      .filter((f) => f.type === tipo && f.fee_payer === "collector")
      .reduce((s, f) => s + f.amount, 0);
  const datos = {
    estado: pago.status,
    tipoMedio: pago.payment_type_id,
    medioPago: pago.payment_method_id,
    cuotas: pago.installments,
    monto: pago.transaction_amount,
    comisionMercadoPago: fee("mercadopago_fee"),
    costoFinanciacion: fee("financing_fee"),
    neto: pago.transaction_details?.net_received_amount ?? pago.transaction_amount,
    fechaAprobado: new Date(pago.date_approved),
    fechaLiberacion: pago.money_release_date ? new Date(pago.money_release_date) : null,
  };

  try {
    await prisma.pagoMercadoPago.upsert({
      where: { mpPaymentId: String(pago.id) },
      create: { mpPaymentId: String(pago.id), ventaId: venta.id, ...datos },
      update: datos,
    });
    return "guardado";
  } catch (err) {
    // La venta ya tiene otro pago aprobado (no se vio nunca: Tiendup cobra
    // cada orden con un solo pago). Se deja el primero.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      console.error(`[mercadopago] la venta de la orden ${orderId} ya tiene otro pago; se saltea ${pago.id}`);
      return "salteado";
    }
    throw err;
  }
}

type PagoConComisiones = Pick<
  Prisma.PagoMercadoPagoGetPayload<object>,
  "estado" | "comisionMercadoPago" | "costoFinanciacion"
>;

/**
 * Lo que cuesta cobrar la venta por Mercado Pago: comision + financiacion de
 * las cuotas. Un pago devuelto o contracargado no cuenta (la venta tampoco
 * se cobro).
 */
export function costoCobro(pago: PagoConComisiones | null | undefined) {
  if (!pago || pago.estado !== "approved") return new Prisma.Decimal(0);
  return pago.comisionMercadoPago.plus(pago.costoFinanciacion);
}

export const NOMBRE_MEDIO: Record<string, string> = {
  account_money: "Dinero en cuenta",
  visa: "Visa",
  master: "Mastercard",
  amex: "American Express",
  naranja: "Naranja",
  cabal: "Cabal",
  debvisa: "Visa Débito",
  debmaster: "Mastercard Débito",
  debcabal: "Cabal Débito",
  maestro: "Maestro",
};

export function nombreMedio(pago: { medioPago: string; cuotas: number; tipoMedio: string }) {
  const nombre = NOMBRE_MEDIO[pago.medioPago] ?? pago.medioPago;
  if (pago.tipoMedio !== "credit_card") return nombre;
  return `${nombre} · ${pago.cuotas === 1 ? "1 cuota" : `${pago.cuotas} cuotas`}`;
}
