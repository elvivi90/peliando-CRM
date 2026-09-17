import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatMoney } from "@/lib/format";

const CATEGORIA_LABEL: Record<string, string> = {
  TRANSPORTE: "Transporte",
  COMIDA: "Comida",
  MARKETING_PRODUCCION: "Marketing / Producción",
  OTROS: "Otros",
};

export default async function GastosPage() {
  const gastos = await prisma.gasto.findMany({
    orderBy: { fecha: "desc" },
    take: 100,
    include: { evento: true, usuario: true },
  });

  return (
    <div>
      <PageHeader
        title="Gastos"
        subtitle="Viáticos operativos: nafta, peajes, comida, carteles, producción."
        action={
          <Link href="/gastos/nuevo" className="btn-primary text-sm">
            + Nuevo gasto
          </Link>
        }
      />

      {gastos.length === 0 ? (
        <EmptyState title="Todavía no hay gastos registrados" />
      ) : (
        <div className="card-chunky overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-navy/15 text-left">
                  <th className="px-5 py-3 font-extrabold text-xs uppercase text-navy/60">Fecha</th>
                  <th className="px-5 py-3 font-extrabold text-xs uppercase text-navy/60">Concepto</th>
                  <th className="px-5 py-3 font-extrabold text-xs uppercase text-navy/60">Categoría</th>
                  <th className="px-5 py-3 font-extrabold text-xs uppercase text-navy/60">Evento</th>
                  <th className="px-5 py-3 font-extrabold text-xs uppercase text-navy/60">Monto</th>
                </tr>
              </thead>
              <tbody>
                {gastos.map((g) => (
                  <tr key={g.id} className="border-b border-navy/10 last:border-0">
                    <td className="px-5 py-3 text-navy/70 whitespace-nowrap">{formatDate(g.fecha)}</td>
                    <td className="px-5 py-3 font-semibold">{g.concepto}</td>
                    <td className="px-5 py-3 text-navy/60">{CATEGORIA_LABEL[g.categoria]}</td>
                    <td className="px-5 py-3 text-navy/60">{g.evento?.nombre ?? "—"}</td>
                    <td className="px-5 py-3 font-bold whitespace-nowrap">{formatMoney(g.monto)}</td>
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
