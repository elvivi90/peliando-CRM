import Link from "next/link";
import { after } from "next/server";
import { endOfMonth, endOfYear, startOfMonth, startOfYear } from "date-fns";
import { MapaVentas } from "@/components/reportes/mapa-ventas";
import { getMapaVentas } from "@/lib/services/mapa";
import { geocodificarPendientes } from "@/lib/services/geocoding";
import { StatCard } from "@/components/ui/stat-card";
import { VentasChart } from "@/components/dashboard/ventas-chart";
import { ComparacionChart } from "@/components/dashboard/comparacion-chart";
import { formatMoney } from "@/lib/format";
import {
  getResumenMes,
  getResumenAnio,
  getComparacionMeses,
  getResumenInversion,
  getAniosConVentas,
  margenReal,
} from "@/lib/services/reportes";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; anio?: string; mes?: string }>;
}) {
  const { periodo, anio, mes } = await searchParams;
  const anual = periodo === "anio";
  const ahora = new Date();
  const anioSel = anio ? Number(anio) : ahora.getFullYear();
  const mesSel = mes ? Number(mes) : ahora.getMonth() + 1;

  const inicioPeriodo = anual
    ? startOfYear(new Date(anioSel, 0, 1))
    : startOfMonth(new Date(anioSel, mesSel - 1, 1));
  const finPeriodo = anual ? endOfYear(inicioPeriodo) : endOfMonth(inicioPeriodo);

  const [mensual, anualResumen, comparacion, inversion, anios, mapa] = await Promise.all([
    anual ? null : getResumenMes(anioSel, mesSel),
    anual ? getResumenAnio(anioSel) : null,
    anual ? null : getComparacionMeses(6),
    getResumenInversion(),
    getAniosConVentas(),
    getMapaVentas(inicioPeriodo, finPeriodo),
  ]);
  // Lugares que todavia no tienen coordenadas: se buscan despues de
  // responder y aparecen en el mapa la proxima vez.
  if (mapa.pendientes.length > 0) {
    after(() => geocodificarPendientes(mapa.pendientes));
  }
  const resumen = (anual ? anualResumen : mensual)!;
  const costoUnitario = inversion.costoUnitarioPromedio;
  const margen = margenReal(resumen, costoUnitario);
  const etiquetaPeriodo = anual ? String(anioSel) : `${MESES[mesSel - 1]} ${anioSel}`;

  const opcionesMes = Array.from({ length: 12 }, (_, i) => i + 1);
  const opcionesAnio = anios.includes(anioSel) ? anios : [...anios, anioSel].sort();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl lg:text-[28px] font-black tracking-tight">Reportes</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex rounded-xl border-2 border-navy overflow-hidden text-sm">
            <Link
              href={`/reportes?anio=${anioSel}&mes=${mesSel}`}
              className={`px-4 py-2 ${anual ? "bg-tarjeta text-navy/50 font-bold" : "bg-amarillo font-black"}`}
            >
              Mensual
            </Link>
            <Link
              href={`/reportes?periodo=anio&anio=${anioSel}`}
              className={`px-4 py-2 ${anual ? "bg-amarillo font-black" : "bg-tarjeta text-navy/50 font-bold"}`}
            >
              Anual
            </Link>
          </div>
          <form className="flex gap-2" action="/reportes">
            {anual ? (
              <input type="hidden" name="periodo" value="anio" />
            ) : (
              <select name="mes" defaultValue={mesSel} className="input-chunky text-sm py-2">
                {opcionesMes.map((m) => (
                  <option key={m} value={m}>
                    {MESES[m - 1]}
                  </option>
                ))}
              </select>
            )}
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
      </div>

      <div className="flex flex-wrap gap-4">
        <StatCard label="Total vendido" value={formatMoney(resumen.totalVentas)} stripe="amarillo" />
        <StatCard
          label="Total gastos"
          value={formatMoney(resumen.totalGastos)}
          hint={
            resumen.totalEnvios.gt(0)
              ? `operativos + ${formatMoney(resumen.totalEnvios)} de envíos`
              : "solo operativos"
          }
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
          hint={anual ? "histórico, no anual" : "histórico, no mensual"}
          stripe="rosa"
        />
        <StatCard
          label="Costo unitario promedio"
          value={costoUnitario ? `${formatMoney(costoUnitario)} c/u` : "—"}
          hint={costoUnitario ? "inversión ÷ unidades producidas" : "sin tiradas con unidades cargadas"}
          stripe="rosa"
        />
        <StatCard
          label={`Margen real (${anual ? anioSel : `${MESES[mesSel - 1].slice(0, 3)} ${anioSel}`})`}
          value={margen ? `${formatMoney(margen)} c/u` : "—"}
          hint="precio venta − costo unitario"
          stripe="amarillo"
          hintColor={margen?.lt(0) ? "rosa" : undefined}
        />
      </div>

      <div className="card-chunky p-5 lg:p-6">
        <div className="text-xs font-black uppercase tracking-wide text-navy/55 mb-4">
          Desglose por tipo de cliente — {etiquetaPeriodo}
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
          Mapa de ventas — {etiquetaPeriodo}
        </div>
        <div className="h-96">
          <MapaVentas puntos={mapa.puntos} />
        </div>
        <p className="text-xs text-navy/50 mt-2">
          Zoom: Ctrl + rueda del mouse, o con dos dedos en el celular.
        </p>

        {mapa.puntos.length > 0 && (
          <div className="overflow-x-auto mt-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-navy/15 text-left">
                  {["Localidad", "Ventas", "Unidades", "Monto"].map((h, i) => (
                    <th
                      key={h}
                      className={`py-2 pr-4 font-extrabold text-xs uppercase text-navy/60 ${i > 0 ? "text-right" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mapa.puntos.map((p) => (
                  <tr key={p.etiqueta} className="border-b border-navy/10 last:border-0">
                    <td className="py-2 pr-4 font-semibold">{p.etiqueta}</td>
                    <td className="py-2 pr-4 text-right">{p.ventas}</td>
                    <td className="py-2 pr-4 text-right">{p.unidades}</td>
                    <td className="py-2 pr-4 text-right whitespace-nowrap">{formatMoney(p.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {mapa.sinUbicacion.total > 0 && (
          <p className="text-xs text-navy/60 mt-4">
            {mapa.sinUbicacion.total} de {mapa.totalVentas} ventas no están en el mapa
            {[
              mapa.sinUbicacion.sinDatos > 0 &&
                `${mapa.sinUbicacion.sinDatos} sin evento ni dirección del cliente`,
              mapa.sinUbicacion.retiroEnSucursal > 0 &&
                `${mapa.sinUbicacion.retiroEnSucursal} de Tiendup con retiro en sucursal`,
              mapa.sinUbicacion.noEncontradas > 0 &&
                `${mapa.sinUbicacion.noEncontradas} con una dirección que no se encontró`,
              mapa.sinUbicacion.buscando > 0 &&
                `${mapa.sinUbicacion.buscando} buscando su ubicación (aparecen en unos minutos)`,
            ]
              .filter(Boolean)
              .map((t, i) => `${i === 0 ? ": " : ", "}${t}`)
              .join("")}
            .
          </p>
        )}
      </div>

      {anualResumen ? (
        <>
          <div className="card-chunky p-5 lg:p-6">
            <div className="text-xs font-black uppercase tracking-wide text-navy/55 mb-4">
              Mes a mes — {anioSel}
            </div>
            <div className="h-72">
              <ComparacionChart data={anualResumen.porMes} />
            </div>
          </div>

          <div className="card-chunky overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-navy/15 text-left">
                    {["Mes", "Vendido", "Gastos", "Neto", "Unidades"].map((h, i) => (
                      <th
                        key={h}
                        className={`px-5 py-3 font-extrabold text-xs uppercase text-navy/60 ${i > 0 ? "text-right" : ""}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {anualResumen.porMes.map((m, i) => (
                    <tr key={m.mes} className="border-b border-navy/10">
                      <td className="px-5 py-2.5 font-semibold">{MESES[i]}</td>
                      <td className="px-5 py-2.5 text-right whitespace-nowrap">{formatMoney(m.ventas)}</td>
                      <td className="px-5 py-2.5 text-right whitespace-nowrap">{formatMoney(m.gastos)}</td>
                      <td
                        className={`px-5 py-2.5 text-right whitespace-nowrap font-bold ${m.neto < 0 ? "text-rosa" : ""}`}
                      >
                        {formatMoney(m.neto)}
                      </td>
                      <td className="px-5 py-2.5 text-right">{m.unidades}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-navy/30 font-black">
                    <td className="px-5 py-3">Total {anioSel}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">{formatMoney(resumen.totalVentas)}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">{formatMoney(resumen.totalGastos)}</td>
                    <td
                      className={`px-5 py-3 text-right whitespace-nowrap ${resumen.neto.lt(0) ? "text-rosa" : ""}`}
                    >
                      {formatMoney(resumen.neto)}
                    </td>
                    <td className="px-5 py-3 text-right">{resumen.unidadesVendidas}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="card-chunky p-5 lg:p-6">
            <div className="text-xs font-black uppercase tracking-wide text-navy/55 mb-4">
              Evolución diaria — {etiquetaPeriodo}
            </div>
            <div className="h-64">
              <VentasChart data={mensual!.ventasPorDia} />
            </div>
          </div>

          <div className="card-chunky p-5 lg:p-6">
            <div className="text-xs font-black uppercase tracking-wide text-navy/55 mb-4">
              Comparación mes a mes
            </div>
            <div className="h-72">
              <ComparacionChart data={comparacion!} />
            </div>
          </div>
        </>
      )}

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
