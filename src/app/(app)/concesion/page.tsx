import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { NuevaEntregaForm } from "@/components/concesion/nueva-entrega-form";
import { ConcesionCard } from "@/components/concesion/concesion-card";
import { getConcesionesConSaldo } from "@/lib/services/concesion";

export default async function ConcesionPage() {
  const [clientesConcesion, productos, concesiones] = await Promise.all([
    prisma.cliente.findMany({
      where: { tipo: "CONCESION" },
      select: { id: true, nombre: true, apellido: true },
      orderBy: { apellido: "asc" },
    }),
    prisma.producto.findMany({ orderBy: { nombre: "asc" } }),
    getConcesionesConSaldo(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Concesión"
        subtitle="El local recibe mercadería sin que sea venta todavía; se liquida cuando avisa cuánto vendió."
      />

      <NuevaEntregaForm clientesConcesion={clientesConcesion} productos={productos} />

      {concesiones.length === 0 ? (
        <EmptyState title="Todavía no hay entregas en concesión" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {concesiones.map((c) => (
            <ConcesionCard
              key={c.id}
              concesion={{
                ...c,
                liquidaciones: c.liquidaciones.map((l) => ({
                  ...l,
                  montoCobrado: l.montoCobrado.toString(),
                })),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
