import type { PagoMercadoPago, Prisma } from "@prisma/client";
import { formatDate, formatMoney } from "@/lib/format";
import { nombreMedio } from "@/lib/services/pagos-mercadopago";
import { ordenTiendupDeVenta } from "@/components/ventas/orden-tiendup";

const ESTADO_MP: Record<string, string> = {
  approved: "Aprobado",
  refunded: "Devuelto",
  charged_back: "Contracargo",
  in_mediation: "En disputa",
  cancelled: "Cancelado",
};

/**
 * Pago de una venta: lo cobrado y, si se cobro por Mercado Pago (ventas de
 * Tiendup, ver el cron pagos-mercadopago), cuanto se llevo Mercado Pago y
 * cuando se libera la plata.
 */
export function PagoPanel({
  precioTotal,
  montoCobrado,
  pago,
  medioPago,
}: {
  precioTotal: Prisma.Decimal;
  montoCobrado: Prisma.Decimal;
  pago: PagoMercadoPago | null;
  // Sin pago de Mercado Pago: el medio que informa Tiendup (ver PagoTiendup)
  // o la forma de pago cargada en una venta manual.
  medioPago?: string | null;
}) {
  const liberado = pago?.fechaLiberacion ? pago.fechaLiberacion <= new Date() : false;
  const otros = pago
    ? pago.monto.minus(pago.neto).minus(pago.comisionMercadoPago).minus(pago.costoFinanciacion)
    : null;

  return (
    <div className="card-chunky p-5">
      <h2 className="font-extrabold text-sm uppercase tracking-wide text-navy/60 mb-3">Pago</h2>
      {pago && pago.estado !== "approved" && (
        <p className="mb-3 rounded-xl border-2 border-rosa bg-rosa/10 px-3 py-2 text-sm font-semibold text-rosa">
          {ESTADO_MP[pago.estado] ?? pago.estado} en Mercado Pago: la comisión no cuenta como gasto.
        </p>
      )}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <Dato
          label="Cobrado"
          value={
            montoCobrado.gte(precioTotal)
              ? formatMoney(montoCobrado)
              : `${formatMoney(montoCobrado)} / ${formatMoney(precioTotal)}`
          }
        />
        {pago ? (
          <>
            <Dato label="Medio de pago" value={nombreMedio(pago)} />
            <Dato label="Comisión" value={formatMoney(pago.comisionMercadoPago)} />
            <Dato
              label="Costo de las cuotas"
              value={pago.costoFinanciacion.gt(0) ? formatMoney(pago.costoFinanciacion) : "—"}
            />
            {otros && otros.gt(0.009) && <Dato label="Otros descuentos" value={formatMoney(otros)} />}
            <Dato label="Neto acreditado" value={formatMoney(pago.neto)} />
            <Dato
              label={liberado ? "Liberado el" : "Se libera el"}
              value={pago.fechaLiberacion ? formatDate(pago.fechaLiberacion) : "—"}
            />
          </>
        ) : (
          <Dato label="Medio de pago" value={medioPago || "—"} />
        )}
      </div>
    </div>
  );
}

/**
 * Pago de una venta de Tiendup que todavia no tiene cobro de Mercado Pago:
 * el medio de pago sale de la orden ("Transferencia bancaria"). Si la orden
 * se pago por Mercado Pago, el cobro llega con el cron del dia siguiente.
 */
export async function PagoTiendup({
  tiendupOrderId,
  precioTotal,
  montoCobrado,
}: {
  tiendupOrderId: number;
  precioTotal: Prisma.Decimal;
  montoCobrado: Prisma.Decimal;
}) {
  const orden = await ordenTiendupDeVenta(tiendupOrderId);
  const gateway = orden?.gateway?.name?.trim() || null;
  const medioPago =
    gateway && /mercado\s*pago/i.test(gateway) ? "Mercado Pago (se actualiza a diario)" : gateway;
  return (
    <PagoPanel precioTotal={precioTotal} montoCobrado={montoCobrado} pago={null} medioPago={medioPago} />
  );
}

function Dato({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-bold text-navy/50 uppercase">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
