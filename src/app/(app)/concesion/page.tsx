import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ConcesionCard } from "@/components/concesion/concesion-card";
import { getConcesionesConSaldo } from "@/lib/services/concesion";

export default async function ConcesionPage() {
  const concesiones = await getConcesionesConSaldo();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Concesión"
        subtitle="Mercadería entregada a mayoristas y distribuidores sin que sea venta todavía; se liquida cuando avisan cuánto vendieron. Las entregas nuevas se cargan desde la ficha del cliente."
      />

      {concesiones.length === 0 ? (
        <EmptyState title="Todavía no hay entregas en concesión" subtitle="Se crean desde la ficha de un cliente mayorista o distribuidor." />
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
