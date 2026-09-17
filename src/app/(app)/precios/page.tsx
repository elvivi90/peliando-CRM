import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { EstadoBadge } from "@/components/ui/badge";
import { formatDate, formatMoney } from "@/lib/format";

export default async function PreciosPage() {
  const listas = await prisma.listaDePrecios.findMany({
    orderBy: { fechaInicioVigencia: "desc" },
    include: { tramos: { orderBy: { cantidadDesde: "asc" } } },
  });

  return (
    <div>
      <PageHeader
        title="Lista de precios"
        subtitle="Solo una lista puede estar activa a la vez. Las anteriores quedan históricas para trazabilidad."
        action={
          <Link href="/precios/nueva" className="btn-primary text-sm">
            + Nueva lista
          </Link>
        }
      />

      <div className="flex flex-col gap-5">
        {listas.map((lista) => (
          <div key={lista.id} className="card-chunky p-5">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <div className="flex items-center gap-3">
                <h2 className="font-black text-lg">{lista.nombre}</h2>
                <EstadoBadge estado={lista.estado} />
              </div>
              <span className="text-xs text-navy/50 font-semibold">
                Vigente desde {formatDate(lista.fechaInicioVigencia)}
                {lista.fechaFinVigencia && ` hasta ${formatDate(lista.fechaFinVigencia)}`}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="rounded-xl border-2 border-navy/15 px-3 py-2.5">
                <div className="text-[10px] font-extrabold uppercase text-navy/50">PVP minorista</div>
                <div className="font-black">{formatMoney(lista.pvp)}</div>
              </div>
              {lista.tramos.map((t) => (
                <div key={t.id} className="rounded-xl border-2 border-navy/15 px-3 py-2.5">
                  <div className="text-[10px] font-extrabold uppercase text-navy/50">
                    Desde {t.cantidadDesde} un.
                  </div>
                  <div className="font-black">{formatMoney(t.precioUnitario)}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
