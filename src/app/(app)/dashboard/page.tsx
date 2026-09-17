import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/ui/stat-card";
import { TipoBadge } from "@/components/ui/badge";
import { VentasChart } from "@/components/dashboard/ventas-chart";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatMoney } from "@/lib/format";
import { getResumenMes } from "@/lib/services/reportes";
import { resumenCuentasCorrientesPendientes } from "@/lib/services/cuenta-corriente";

const MES_NOMBRE = new Intl.DateTimeFormat("es-AR", { month: "long" });

export default async function DashboardPage() {
  const ahora = new Date();
  const [resumen, pendientes, ultimasVentas] = await Promise.all([
    getResumenMes(ahora.getFullYear(), ahora.getMonth() + 1),
    resumenCuentasCorrientesPendientes(),
    prisma.venta.findMany({
      orderBy: { fecha: "desc" },
      take: 6,
      include: { cliente: true },
    }),
  ]);

  const saldoPendienteTotal = pendientes.reduce(
    (s, p) => s.plus(p.saldoPendiente),
    new Prisma.Decimal(0),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl lg:text-[28px] font-black tracking-tight capitalize">
          {MES_NOMBRE.format(ahora)} {ahora.getFullYear()}
        </h1>
        <Link href="/reportes" className="text-sm font-extrabold underline decoration-2">
          Ver reportes completos →
        </Link>
      </div>

      <div className="flex flex-wrap gap-4 lg:gap-5">
        <StatCard
          label="Ventas del mes"
          value={formatMoney(resumen.totalVentas)}
          hint={`${resumen.unidadesVendidas} unidades vendidas`}
          stripe="amarillo"
        />
        <StatCard
          label="Gastos del mes"
          value={formatMoney(resumen.totalGastos)}
          hint={`${resumen.cantidadVentas} venta${resumen.cantidadVentas === 1 ? "" : "s"} este mes`}
          stripe="rosa"
        />
        <StatCard
          label="Resultado neto"
          value={formatMoney(resumen.neto)}
          hint="Ventas − gastos"
          stripe="navy"
        />
        <StatCard
          label="Cuentas pendientes"
          value={formatMoney(saldoPendienteTotal)}
          hint={`${pendientes.length} cliente${pendientes.length === 1 ? "" : "s"} con saldo`}
          stripe="azul"
          hintColor={pendientes.length > 0 ? "rosa" : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
        <div className="card-chunky p-5 lg:p-6 flex flex-col">
          <div className="text-xs font-black uppercase tracking-wide text-navy/55 mb-1">
            Ventas por día
          </div>
          <p className="text-sm text-navy/60 mb-4">
            Los picos suelen coincidir con ferias o encuentros del mes.
          </p>
          <div className="h-56 lg:h-64">
            <VentasChart data={resumen.ventasPorDia} />
          </div>
        </div>

        <div className="card-chunky p-5 lg:p-6 flex flex-col">
          <div className="text-xs font-black uppercase tracking-wide text-navy/55 mb-4">
            Últimas ventas
          </div>
          {ultimasVentas.length === 0 ? (
            <p className="text-sm text-navy/50">Todavía no hay ventas cargadas.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {ultimasVentas.map((v) => (
                <Link
                  key={v.id}
                  href={`/ventas/${v.id}`}
                  className="flex items-center justify-between gap-3 pb-3 border-b-2 border-navy/10 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <TipoDot tipo={v.tipo} />
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold truncate">
                        {v.cliente.nombre} {v.cliente.apellido}
                      </div>
                      <div className="text-xs text-navy/55">
                        <TipoBadgeInline tipo={v.tipo} /> · {v.cantidad} un.
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-black flex-none">{formatMoney(v.precioTotal)}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {pendientes.length > 0 && (
        <div className="card-chunky p-5">
          <div className="text-xs font-black uppercase tracking-wide text-navy/55 mb-4">
            Clientes con cuenta corriente pendiente
          </div>
          <div className="flex flex-col gap-2.5">
            {pendientes.slice(0, 6).map((p) => (
              <Link
                key={p.cliente.id}
                href={`/clientes/${p.cliente.id}`}
                className="flex items-center justify-between text-sm border-b border-navy/10 pb-2.5 last:border-0 last:pb-0"
              >
                <span className="font-bold">
                  {p.cliente.nombre} {p.cliente.apellido}
                </span>
                <span className="flex items-center gap-3 text-xs font-semibold text-navy/60">
                  {p.cantidadPendiente > 0 && <span>{p.cantidadPendiente} un. sin entregar</span>}
                  {p.saldoPendiente.gt(0) && (
                    <span className="text-rosa font-extrabold">{formatMoney(p.saldoPendiente)}</span>
                  )}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {resumen.cantidadVentas === 0 && (
        <EmptyState
          title="Todavía no cargaste ninguna venta este mes"
          subtitle="Usá el botón + Nueva venta para empezar."
        />
      )}
    </div>
  );
}

function TipoDot({ tipo }: { tipo: string }) {
  const color =
    tipo === "MINORISTA"
      ? "bg-azul"
      : tipo === "MAYORISTA"
        ? "bg-amarillo"
        : tipo === "DISTRIBUIDOR"
          ? "bg-rosa"
          : "bg-navy";
  return <span className={`w-2.5 h-2.5 rounded-full flex-none ${color}`} />;
}

function TipoBadgeInline({ tipo }: { tipo: string }) {
  const label =
    tipo === "MINORISTA"
      ? "Minorista"
      : tipo === "MAYORISTA"
        ? "Mayorista"
        : tipo === "DISTRIBUIDOR"
          ? "Distribuidor"
          : "Concesión";
  return <span>{label}</span>;
}
