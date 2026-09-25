import Link from "next/link";
import { StatCard } from "@/components/ui/stat-card";
import { VentasChart } from "@/components/dashboard/ventas-chart";
import { ComparacionChart } from "@/components/dashboard/comparacion-chart";
import { formatMoney } from "@/lib/format";
import {
  getResumenMes,
  getComparacionMeses,
  getResumenInversion,
  margenReal,
} from "@/lib/services/reportes";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; mes?: string }>;
}) {
  const { anio, mes } = await searchParams;
  const ahora = new Date();
  const anioSel = anio ? Number(anio) : ahora.getFullYear();
  const mesSel = mes ? Number(mes) : ahora.getMonth() + 1;

  const [resumen, comparacion, inversion] = await Promise.all([
    getResumenMes(anioSel, mesSel),
    getComparacionMeses(6),
    getResumenInversion(),
  ]);
  const costoUnitario = inversion.costoUnitarioPromedio;
  const margen = margenReal(resumen, costoUnitario);

  const opcionesMes = Array.from({ length: 12 }, (_, i) => i + 1);
  const opcionesAnio = [ahora.getFullYear() - 1, ahora.getFullYear(), ahora.getFullYear() + 1];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl lg:text-[28px] font-black tracking-tight">Reportes</h1>
        <form className="flex gap-2" action="/reportes">
          <select name="mes" defaultValue={mesSel} className="input-chunky text-sm py-2">
            {opcionesMes.map((m) => (
              <option key={m} value={m}>
                {MESES[m - 1]}
              </option>
            ))}
          </select>
          <select name="anio" defaultValue={anioSel} className="input-chunky text-sm py-2">
            {opcionesAnio.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-secondary text-sm">
            Ver
          </button>
        </form>
      </div>

      <div className="flex flex-wrap gap-4">
        <StatCard label="Total vendido" value={formatMoney(resumen.totalVentas)} stripe="amarillo" />
        <StatCard
          label="Total gastos"
          value={formatMoney(resumen.totalGastos)}
          hint="solo operativos"
          stripe="rosa"
        />
        <StatCard
          label="Resultado neto"
          value={formatMoney(resumen.neto)}
          hint="sin distorsión por inversión"
          stripe="navy"
        />
        <StatCard label="Unidades vendidas" value={String(resumen.unidadesVendidas)} stripe="azul" />
      </div>

      <div className="flex flex-wrap gap-4">
        <StatCard
          label="Inversión acumulada"
          value={formatMoney(inversion.inversionAcumulada)}
          hint="histórico, no mensual"
          stripe="rosa"
        />
        <StatCard
          label="Costo unitario promedio"
          value={costoUnitario ? `${formatMoney(costoUnitario)} c/u` : "—"}
          hint={costoUnitario ? "inversión ÷ unidades producidas" : "sin tiradas con unidades cargadas"}
          stripe="rosa"
        />
        <StatCard
          label={`Margen real (${MESES[mesSel - 1].slice(0, 3)} ${anioSel})`}
          value={margen ? `${formatMoney(margen)} c/u` : "—"}
          hint="precio venta − costo unitario"
          stripe="amarillo"
          hintColor={margen?.lt(0) ? "rosa" : undefined}
        />
      </div>

      <div className="card-chunky p-5 lg:p-6">
        <div className="text-xs font-black uppercase tracking-wide text-navy/55 mb-4">
          Desglose por tipo de cliente
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <TipoStat label="Minorista" value={resumen.totalPorTipo.MINORISTA.toNumber()} />
          <TipoStat label="Mayorista" value={resumen.totalPorTipo.MAYORISTA.toNumber()} />
          <TipoStat label="Distribuidor" value={resumen.totalPorTipo.DISTRIBUIDOR.toNumber()} />
          <TipoStat label="Concesión" value={resumen.totalPorTipo.CONCESION.toNumber()} />
        </div>
      </div>

      <div className="card-chunky p-5 lg:p-6">
        <div className="text-xs font-black uppercase tracking-wide text-navy/55 mb-4">
          Evolución diaria — {MESES[mesSel - 1]} {anioSel}
        </div>
        <div className="h-64">
          <VentasChart data={resumen.ventasPorDia} />
        </div>
      </div>

      <div className="card-chunky p-5 lg:p-6">
        <div className="text-xs font-black uppercase tracking-wide text-navy/55 mb-4">
          Comparación mes a mes
        </div>
        <div className="h-72">
          <ComparacionChart data={comparacion} />
        </div>
      </div>

      <Link href="/dashboard" className="text-sm font-extrabold underline decoration-2 self-start">
        ← Volver al dashboard
      </Link>
    </div>
  );
}

function TipoStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border-2 border-navy/15 px-4 py-3">
      <div className="text-[10px] font-extrabold uppercase text-navy/50">{label}</div>
      <div className="font-black text-lg mt-0.5">{formatMoney(value)}</div>
    </div>
  );
}
