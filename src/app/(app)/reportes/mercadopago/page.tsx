import Link from "next/link";
import { startOfMonth } from "date-fns";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { formatDate, formatMoney, nombreCliente } from "@/lib/format";
import { mercadoPagoConfigurado } from "@/lib/services/mercado-pago";
import { costoCobro, nombreMedio } from "@/lib/services/pagos-mercadopago";

export default async function MercadoPagoPage() {
  const ahora = new Date();
  const [porLiberar, delMes, recientes] = await Promise.all([
    prisma.pagoMercadoPago.findMany({
      where: { estado: "approved", fechaLiberacion: { gt: ahora } },
      orderBy: { fechaLiberacion: "asc" },
    }),
    prisma.pagoMercadoPago.findMany({ where: { fechaAprobado: { gte: startOfMonth(ahora) } } }),
    prisma.pagoMercadoPago.findMany({
      orderBy: { fechaAprobado: "desc" },
      take: 50,
      include: { venta: { include: { cliente: true } } },
    }),
  ]);

  const totalPorLiberar = porLiberar.reduce((s, p) => s.plus(p.neto), new Prisma.Decimal(0));
  const comisionesMes = delMes.reduce((s, p) => s.plus(costoCobro(p)), new Prisma.Decimal(0));
  const cobradoMes = delMes
    .filter((p) => p.estado === "approved")
    .reduce((s, p) => s.plus(p.monto), new Prisma.Decimal(0));

  // Liberaciones agrupadas por dia (hay pocas por dia: una por venta).
  const porDia = new Map<string, { fecha: Date; total: Prisma.Decimal; cantidad: number }>();
  for (const p of porLiberar) {
    const clave = formatDate(p.fechaLiberacion);
    const dia = porDia.get(clave) ?? { fecha: p.fechaLiberacion!, total: new Prisma.Decimal(0), cantidad: 0 };
    dia.total = dia.total.plus(p.neto);
    dia.cantidad++;
    porDia.set(clave, dia);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Mercado Pago" subtitle="Cobros de Tiendup: comisiones y plata por liberar" />

      {!mercadoPagoConfigurado() && (
        <p className="rounded-xl border-2 border-rosa bg-rosa/10 px-4 py-3 text-sm font-semibold text-rosa">
          Falta el Access Token de Mercado Pago: por ahora el CRM no trae los cobros.
        </p>
      )}

      <div className="flex gap-3 flex-wrap">
        <StatCard
          label="Por liberar"
          value={formatMoney(totalPorLiberar)}
          stripe="amarillo"
          hint={`${porLiberar.length} venta${porLiberar.length === 1 ? "" : "s"}, ya sin comisiones`}
        />
        <StatCard
          label="Comisiones del mes"
          value={formatMoney(comisionesMes)}
          stripe="rosa"
          hint={
            cobradoMes.gt(0)
              ? `${comisionesMes.div(cobradoMes).times(100).toFixed(1)}% de lo cobrado`
              : undefined
          }
        />
        <StatCard label="Cobrado del mes" value={formatMoney(cobradoMes)} stripe="navy" />
      </div>
      <p className="text-xs text-navy/55 -mt-3">
        Se actualiza una vez por día. Las comisiones incluyen el costo de ofrecer cuotas y suman como
        gasto en Reportes.
      </p>

      <div className="card-chunky p-5">
        <h2 className="font-extrabold text-sm uppercase tracking-wide text-navy/60 mb-3">
          Próximas liberaciones
        </h2>
        {porDia.size === 0 ? (
          <p className="text-sm text-navy/60">No hay plata pendiente de liberar.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {[...porDia.entries()].map(([clave, dia]) => (
              <li
                key={clave}
                className="flex items-center justify-between gap-3 text-sm border-t border-navy/10 pt-2 first:border-0 first:pt-0"
              >
                <span>
                  {clave}
                  <span className="text-navy/55">
                    {" "}
                    · {dia.cantidad} venta{dia.cantidad === 1 ? "" : "s"}
                  </span>
                </span>
                <span className="font-bold">{formatMoney(dia.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card-chunky p-5">
        <h2 className="font-extrabold text-sm uppercase tracking-wide text-navy/60 mb-3">
          Últimos cobros
        </h2>
        {recientes.length === 0 ? (
          <p className="text-sm text-navy/60">Todavía no se trajo ningún cobro.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recientes.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 text-sm border-t border-navy/10 pt-2 first:border-0 first:pt-0"
              >
                <Link href={`/ventas/${p.ventaId}`} className="min-w-0 hover:underline">
                  <span className="font-bold">
                    {p.venta.cliente ? nombreCliente(p.venta.cliente) : "Venta rápida"}
                  </span>
                  <span className="text-navy/60">
                    {" "}
                    · {formatDate(p.fechaAprobado)} · {nombreMedio(p)}
                  </span>
                </Link>
                <span className="text-right flex-none">
                  <span className="font-bold">{formatMoney(p.neto)}</span>
                  <span className="block text-xs text-navy/55">
                    {p.estado === "approved"
                      ? `−${formatMoney(costoCobro(p))} · libera ${formatDate(p.fechaLiberacion)}`
                      : "devuelto"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link href="/reportes" className="text-sm font-extrabold underline decoration-2 self-start">
        ← Volver a reportes
      </Link>
    </div>
  );
}
