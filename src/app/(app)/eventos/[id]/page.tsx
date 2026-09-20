import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { TipoBadge } from "@/components/ui/badge";
import { formatDate, formatMoney, nombreCliente } from "@/lib/format";
import { Prisma } from "@prisma/client";

export default async function EventoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const evento = await prisma.evento.findUnique({
    where: { id },
    include: {
      ventas: { include: { cliente: true, producto: true }, orderBy: { fecha: "asc" } },
      gastos: { orderBy: { fecha: "asc" } },
    },
  });

  if (!evento) notFound();

  const totalVentas = evento.ventas.reduce((s, v) => s.plus(v.precioTotal), new Prisma.Decimal(0));
  const totalGastos = evento.gastos.reduce((s, g) => s.plus(g.monto), new Prisma.Decimal(0));
  const neto = totalVentas.minus(totalGastos);
  const unidades = evento.ventas.reduce((s, v) => s + v.cantidad, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={evento.nombre}
        subtitle={`${formatDate(evento.fecha)}${evento.lugar ? ` · ${evento.lugar}` : ""}`}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MiniStat label="Ventas" value={formatMoney(totalVentas)} />
        <MiniStat label="Unidades" value={String(unidades)} />
        <MiniStat label="Gastos" value={formatMoney(totalGastos)} />
        <MiniStat label="Neto" value={formatMoney(neto)} negative={neto.lt(0)} />
      </div>

      <div className="card-chunky overflow-hidden">
        <h2 className="font-extrabold text-sm uppercase tracking-wide text-navy/60 px-5 pt-5">
          Ventas
        </h2>
        {evento.ventas.length === 0 ? (
          <p className="text-sm text-navy/50 px-5 py-5">Sin ventas asociadas.</p>
        ) : (
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-navy/15 text-left">
                  <th className="px-5 py-2.5 font-extrabold text-xs uppercase text-navy/60">Cliente</th>
                  <th className="px-5 py-2.5 font-extrabold text-xs uppercase text-navy/60">Tipo</th>
                  <th className="px-5 py-2.5 font-extrabold text-xs uppercase text-navy/60">Cant.</th>
                  <th className="px-5 py-2.5 font-extrabold text-xs uppercase text-navy/60">Total</th>
                </tr>
              </thead>
              <tbody>
                {evento.ventas.map((v) => (
                  <tr key={v.id} className="border-b border-navy/10 last:border-0">
                    <td className="px-5 py-2.5 font-semibold">
                      {nombreCliente(v.cliente)}
                    </td>
                    <td className="px-5 py-2.5">
                      <TipoBadge tipo={v.tipo} />
                    </td>
                    <td className="px-5 py-2.5">{v.cantidad}</td>
                    <td className="px-5 py-2.5 font-bold">{formatMoney(v.precioTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card-chunky overflow-hidden">
        <h2 className="font-extrabold text-sm uppercase tracking-wide text-navy/60 px-5 pt-5">
          Gastos
        </h2>
        {evento.gastos.length === 0 ? (
          <p className="text-sm text-navy/50 px-5 py-5">Sin gastos asociados.</p>
        ) : (
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-navy/15 text-left">
                  <th className="px-5 py-2.5 font-extrabold text-xs uppercase text-navy/60">Concepto</th>
                  <th className="px-5 py-2.5 font-extrabold text-xs uppercase text-navy/60">Categoría</th>
                  <th className="px-5 py-2.5 font-extrabold text-xs uppercase text-navy/60">Monto</th>
                </tr>
              </thead>
              <tbody>
                {evento.gastos.map((g) => (
                  <tr key={g.id} className="border-b border-navy/10 last:border-0">
                    <td className="px-5 py-2.5 font-semibold">{g.concepto}</td>
                    <td className="px-5 py-2.5 text-navy/60">{g.categoria}</td>
                    <td className="px-5 py-2.5 font-bold">{formatMoney(g.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <div className="card-chunky p-4">
      <div className="text-[10px] font-extrabold uppercase text-navy/50">{label}</div>
      <div className={`font-black text-xl mt-1 ${negative ? "text-rosa" : ""}`}>{value}</div>
    </div>
  );
}
