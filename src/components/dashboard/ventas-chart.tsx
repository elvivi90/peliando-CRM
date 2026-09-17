"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, Tooltip, Cell } from "recharts";
import { formatMoney } from "@/lib/format";

export function VentasChart({ data }: { data: { dia: string; total: number }[] }) {
  const max = Math.max(...data.map((d) => d.total), 1);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="dia"
          tick={{ fontSize: 10, fill: "#14265399" }}
          axisLine={{ stroke: "#142653" }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <Tooltip
          cursor={{ fill: "#14265311" }}
          contentStyle={{
            background: "#FAF3E4",
            border: "2px solid #142653",
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 700,
          }}
          formatter={(value) => [formatMoney(Number(value)), "Ventas"]}
          labelFormatter={(label) => `Día ${label}`}
        />
        <Bar dataKey="total" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={d.total === max && max > 0 ? "#F9BD16" : "#14265330"}
              stroke={d.total === max && max > 0 ? "#142653" : "transparent"}
              strokeWidth={2}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
