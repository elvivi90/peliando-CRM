import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { GastoForm } from "@/components/gastos/gasto-form";

export default async function NuevoGastoPage() {
  const eventos = await prisma.evento.findMany({
    orderBy: { fecha: "desc" },
    take: 30,
    select: { id: true, nombre: true },
  });

  return (
    <div>
      <PageHeader title="Nuevo gasto" />
      <GastoForm eventos={eventos} />
    </div>
  );
}
