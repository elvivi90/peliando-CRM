import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { TipoBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { TipoCliente } from "@prisma/client";

const TIPOS: { value: TipoCliente | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "MINORISTA", label: "Minorista" },
  { value: "MAYORISTA", label: "Mayorista" },
  { value: "DISTRIBUIDOR", label: "Distribuidor" },
  { value: "CONCESION", label: "Concesión" },
];

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; q?: string }>;
}) {
  const { tipo, q } = await searchParams;

  const clientes = await prisma.cliente.findMany({
    where: {
      tipo: tipo ? (tipo as TipoCliente) : undefined,
      OR: q
        ? [
            { nombre: { contains: q, mode: "insensitive" } },
            { apellido: { contains: q, mode: "insensitive" } },
          ]
        : undefined,
    },
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
  });

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={`${clientes.length} cliente${clientes.length === 1 ? "" : "s"}`}
        action={
          <Link href="/clientes/nuevo" className="btn-primary text-sm">
            + Nuevo cliente
          </Link>
        }
      />

      <div className="flex flex-wrap gap-4 mb-5 items-end">
        <form className="flex flex-wrap gap-3 items-end" action="/clientes">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-extrabold uppercase tracking-wide text-navy/70">
              Buscar
            </span>
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Nombre o apellido"
              className="input-chunky"
            />
          </label>
          <input type="hidden" name="tipo" value={tipo ?? ""} />
          <button type="submit" className="btn-secondary text-sm">
            Buscar
          </button>
        </form>

        <div className="flex gap-1.5 flex-wrap">
          {TIPOS.map((t) => (
            <Link
              key={t.value}
              href={`/clientes${t.value ? `?tipo=${t.value}` : ""}`}
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
      </div>

      {clientes.length === 0 ? (
        <EmptyState
          title="Todavía no hay clientes"
          subtitle="Creá el primer cliente para empezar a cargar ventas."
        />
      ) : (
        <div className="card-chunky overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-navy/15 text-left">
                  <th className="px-5 py-3 font-extrabold text-xs uppercase tracking-wide text-navy/60">
                    Nombre
                  </th>
                  <th className="px-5 py-3 font-extrabold text-xs uppercase tracking-wide text-navy/60">
                    Tipo
                  </th>
                  <th className="px-5 py-3 font-extrabold text-xs uppercase tracking-wide text-navy/60 hidden sm:table-cell">
                    Contacto
                  </th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id} className="border-b border-navy/10 last:border-0">
                    <td className="px-5 py-3">
                      <Link href={`/clientes/${c.id}`} className="font-bold hover:underline">
                        {c.nombre} {c.apellido}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <TipoBadge tipo={c.tipo} />
                    </td>
                    <td className="px-5 py-3 text-navy/60 hidden sm:table-cell">
                      {c.email || c.telefono || "—"}
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
