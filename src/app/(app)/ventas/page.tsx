import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { TipoBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatMoney } from "@/lib/format";
import type { TipoVenta } from "@prisma/client";

const TIPOS: { value: TipoVenta | ""; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "MINORISTA", label: "Minorista" },
  { value: "MAYORISTA", label: "Mayorista" },
  { value: "DISTRIBUIDOR", label: "Distribuidor" },
  { value: "CONCESION", label: "Concesión" },
];

export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo } = await searchParams;

  const ventas = await prisma.venta.findMany({
    where: { tipo: tipo ? (tipo as TipoVenta) : undefined },
    orderBy: { fecha: "desc" },
    take: 100,
    include: { cliente: true, producto: true, evento: true },
  });

  return (
    <div>
      <PageHeader
        title="Ventas"
        subtitle={`${ventas.length} venta${ventas.length === 1 ? "" : "s"} (últimas 100)`}
        action={
          <Link href="/ventas/nueva" className="btn-primary text-sm">
            + Nueva venta
          </Link>
        }
      />

      <div className="flex gap-1.5 flex-wrap mb-5">
        {TIPOS.map((t) => (
          <Link
            key={t.value}
            href={`/ventas${t.value ? `?tipo=${t.value}` : ""}`}
            className={
              (tipo ?? "") === t.value
                ? "px-3.5 py-2 rounded-xl bg-tarjeta border-2 border-navy text-xs font-extrabold"
                : "px-3.5 py-2 rounded-xl text-xs font-bold opacity-55 hover:opacity-100"
            }
          >
            {t.label}
          </Link>
        ))}
      </div>

      {ventas.length === 0 ? (
        <EmptyState title="Todavía no hay ventas registradas" />
      ) : (
        <div className="card-chunky overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-navy/15 text-left">
                  <th className="px-5 py-3 font-extrabold text-xs uppercase tracking-wide text-navy/60">
                    Fecha
                  </th>
                  <th className="px-5 py-3 font-extrabold text-xs uppercase tracking-wide text-navy/60">
                    Cliente
                  </th>
                  <th className="px-5 py-3 font-extrabold text-xs uppercase tracking-wide text-navy/60">
                    Tipo
                  </th>
                  <th className="px-5 py-3 font-extrabold text-xs uppercase tracking-wide text-navy/60">
                    Cant.
                  </th>
                  <th className="px-5 py-3 font-extrabold text-xs uppercase tracking-wide text-navy/60">
                    Total
                  </th>
                  <th className="px-5 py-3 font-extrabold text-xs uppercase tracking-wide text-navy/60 hidden md:table-cell">
                    Evento
                  </th>
                </tr>
              </thead>
              <tbody>
                {ventas.map((v) => (
                  <tr key={v.id} className="border-b border-navy/10 last:border-0">
                    <td className="px-5 py-3 text-navy/70 whitespace-nowrap">{formatDate(v.fecha)}</td>
                    <td className="px-5 py-3">
                      <Link href={`/ventas/${v.id}`} className="font-bold hover:underline">
                        {v.cliente.nombre} {v.cliente.apellido}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <TipoBadge tipo={v.tipo} />
                    </td>
                    <td className="px-5 py-3">
                      {v.cantidad}
                      {v.cantidadEntregada < v.cantidad && (
                        <span
                          className="text-rosa text-xs font-bold ml-1"
                          title="Entrega pendiente"
                        >
                          ⏳
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 font-bold whitespace-nowrap">
                      {formatMoney(v.precioTotal)}
                      {v.montoCobrado.lt(v.precioTotal) && (
                        <span className="text-rosa text-xs font-bold ml-1" title="Cobro pendiente">
                          ⏳
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-navy/60 hidden md:table-cell">
                      {v.evento?.nombre ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
