import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { ClienteForm } from "@/components/clientes/cliente-form";

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [cliente, listas] = await Promise.all([
    prisma.cliente.findUnique({ where: { id } }),
    prisma.listaDePrecios.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, nombre: true, estado: true },
    }),
  ]);

  if (!cliente) notFound();

  return (
    <div>
      <PageHeader title={`Editar ${cliente.nombre} ${cliente.apellido}`} />
      <ClienteForm
        listas={listas}
        clienteId={cliente.id}
        defaultValues={{
          nombre: cliente.nombre,
          apellido: cliente.apellido,
          email: cliente.email ?? "",
          telefono: cliente.telefono ?? "",
          direccion: cliente.direccion ?? "",
          tipo: cliente.tipo,
          precioParticular: cliente.precioParticular?.toString() ?? "",
          listaPrecioId: cliente.listaPrecioId ?? "",
        }}
      />
    </div>
  );
}
