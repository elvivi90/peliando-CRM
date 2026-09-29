import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { nombreCliente } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { ClienteForm } from "@/components/clientes/cliente-form";

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const cliente = await prisma.cliente.findUnique({ where: { id } });

  if (!cliente) notFound();

  return (
    <div>
      <PageHeader title={`Editar ${nombreCliente(cliente)}`} />
      <ClienteForm
        clienteId={cliente.id}
        defaultValues={{
          nombreNegocio: cliente.nombreNegocio ?? "",
          nombre: cliente.nombre,
          apellido: cliente.apellido,
          email: cliente.email ?? "",
          telefono: cliente.telefono ?? "",
          direccion: cliente.direccion ?? "",
          tipo: cliente.tipo,
        }}
      />
    </div>
  );
}
