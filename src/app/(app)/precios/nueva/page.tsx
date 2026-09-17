import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { ListaPreciosForm } from "@/components/precios/lista-precios-form";

export default async function NuevaListaPage() {
  const activa = await prisma.listaDePrecios.findFirst({ where: { estado: "ACTIVA" } });

  return (
    <div>
      <PageHeader title="Nueva lista de precios" />
      <ListaPreciosForm hayListaActiva={!!activa} />
    </div>
  );
}
