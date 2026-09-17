import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { ClienteForm } from "@/components/clientes/cliente-form";

export default async function NuevoClientePage() {
  const listas = await prisma.listaDePrecios.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, nombre: true, estado: true },
  });

  return (
    <div>
      <PageHeader title="Nuevo cliente" />
      <ClienteForm listas={listas} />
    </div>
  );
}
