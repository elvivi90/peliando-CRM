import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatMoney } from "@/lib/format";
import { Prisma } from "@prisma/client";

export default async function EventosPage() {
  const eventos = await prisma.evento.findMany({
    orderBy: { fecha: "desc" },
    include: { ventas: true, gastos: true },
  });

  return (
    <div>
      <PageHeader
        title="Eventos"
        subtitle="Agrupá ventas y gastos de una feria o encuentro para ver la rentabilidad real."
        action={
          <Link href="/eventos/nuevo" className="btn-primary text-sm">
            + Nuevo evento
          </Link>
        }
      />

      {eventos.length === 0 ? (
        <EmptyState title="Todavía no hay eventos cargados" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {eventos.map((ev) => {
            const totalVentas = ev.ventas.reduce(
              (s, v) => s.plus(v.precioTotal),
              new Prisma.Decimal(0),
            );
            const totalGastos = ev.gastos.reduce((s, g) => s.plus(g.monto), new Prisma.Decimal(0));
            const neto = totalVentas.minus(totalGastos);

            return (
              <Link key={ev.id} href={`/eventos/${ev.id}`} className="card-chunky p-5 block">
                <h2 className="font-black text-lg">{ev.nombre}</h2>
                <p className="text-xs text-navy/50 font-semibold mt-0.5">
                  {formatDate(ev.fecha)} {ev.lugar && `· ${ev.lugar}`}
                </p>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div>
                    <div className="text-[10px] font-extrabold uppercase text-navy/50">Ventas</div>
                    <div className="font-bold">{formatMoney(totalVentas)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-extrabold uppercase text-navy/50">Gastos</div>
                    <div className="font-bold">{formatMoney(totalGastos)}</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t-2 border-navy/10">
                  <div className="text-[10px] font-extrabold uppercase text-navy/50">Neto</div>
                  <div className={`font-black text-lg ${neto.lt(0) ? "text-rosa" : ""}`}>
                    {formatMoney(neto)}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
