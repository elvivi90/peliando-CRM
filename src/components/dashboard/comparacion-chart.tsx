"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { formatMoney } from "@/lib/format";

export function ComparacionChart({
  data,
}: {
  data: { mes: string; ventas: number; gastos: number; neto: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="mes"
          tick={{ fontSize: 11, fill: "#14265399", fontWeight: 700 }}
          axisLine={{ stroke: "#142653" }}
          tickLine={false}
        />
        <YAxis hide />
        <Tooltip
          cursor={{ fill: "#14265311" }}
          contentStyle={{
            background: "#FAF3E4",
            border: "2px solid #142653",
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 700,
          }}
          formatter={(value, name) => [formatMoney(Number(value)), String(name)]}
        />
        <Legend
          formatter={(value) => <span style={{ color: "#142653", fontWeight: 800, fontSize: 12 }}>{value}</span>}
        />
        <Bar dataKey="ventas" name="Ventas" fill="#F9BD16" stroke="#142653" strokeWidth={2} radius={[4, 4, 0, 0]} />
        <Bar dataKey="gastos" name="Gastos" fill="#C9579A" stroke="#142653" strokeWidth={2} radius={[4, 4, 0, 0]} />
        <Bar dataKey="neto" name="Neto" fill="#1A66AA" stroke="#142653" strokeWidth={2} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
