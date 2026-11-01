"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatMoney } from "@/lib/format";
import type { MedioReporte } from "@/lib/services/reportes";

// Un color fijo por medio, nunca por posicion: un mes sin efectivo no
// repinta los demas. Paleta categorica validada contra la tarjeta (#faf3e4);
// las "sin especificar" van en grises porque no son un medio.
const COLOR: Record<MedioReporte, string> = {
  "Tarjeta en cuotas": "#2a78d6",
  "Tarjeta en 1 pago": "#eb6834",
  "Dinero en cuenta": "#1baf7a",
  Transferencia: "#eda100",
  Efectivo: "#e87ba4",
  Posnet: "#008300",
  "Mayoristas y distribuidores (sin especificar)": "#5f5a53",
  "Ventas rápidas (sin especificar)": "#9a948b",
  "Sin especificar": "#cfc8bd",
};

type Fila = { medio: MedioReporte; ventas: number; unidades: number; monto: number };

/**
 * Como se cobraron las ventas del periodo. La torta reparte el dinero; la
 * lista al lado da cantidad de ventas, dinero y porcentaje de cada medio
 * (los colores claros no alcanzan contraste sobre la tarjeta: el nombre
 * siempre va escrito).
 */
export function MediosPagoChart({ data }: { data: Fila[] }) {
  const totalMonto = data.reduce((s, d) => s + d.monto, 0);
  const totalVentas = data.reduce((s, d) => s + d.ventas, 0);
  const totalUnidades = data.reduce((s, d) => s + d.unidades, 0);
  const pct = (monto: number) => (totalMonto > 0 ? (monto / totalMonto) * 100 : 0);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="h-56 w-56 flex-none relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="monto"
              nameKey="medio"
              innerRadius="58%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              stroke="#faf3e4"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.medio} fill={COLOR[d.medio]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "#FAF3E4",
                border: "2px solid #142653",
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 700,
              }}
              formatter={(value, _name, item) => {
                const fila = item.payload as Fila;
                return [
                  `${formatMoney(Number(value))} · ${fila.ventas} venta${fila.ventas === 1 ? "" : "s"} (${fila.unidades} un.) · ${pct(fila.monto).toFixed(0)}%`,
                  fila.medio,
                ];
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[11px] font-extrabold uppercase text-navy/55">Total</span>
          <span className="text-lg font-black">{formatMoney(totalMonto)}</span>
          <span className="text-xs text-navy/60">
            {totalVentas} venta{totalVentas === 1 ? "" : "s"} · {totalUnidades} un.
          </span>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase text-navy/60">
            <th className="font-extrabold pb-2">Medio</th>
            <th className="font-extrabold pb-2 text-right">Ventas</th>
            <th className="font-extrabold pb-2 text-right">Unidades</th>
            <th className="font-extrabold pb-2 text-right">Dinero</th>
            <th className="font-extrabold pb-2 text-right">%</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.medio} className="border-t border-navy/10">
              <td className="py-2">
                <span className="inline-flex items-center gap-2 font-semibold">
                  <span
                    className="inline-block w-3 h-3 rounded-sm flex-none"
                    style={{ background: COLOR[d.medio] }}
                    aria-hidden
                  />
                  {d.medio}
                </span>
              </td>
              <td className="py-2 text-right">{d.ventas}</td>
              <td className="py-2 text-right">{d.unidades}</td>
              <td className="py-2 text-right whitespace-nowrap">{formatMoney(d.monto)}</td>
              <td className="py-2 text-right text-navy/60">{pct(d.monto).toFixed(0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
