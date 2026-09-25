import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { VentaForm } from "@/components/ventas/venta-form";
import { fechaInputValue } from "@/lib/date";
import { nombreCliente } from "@/lib/format";
import { esVentaEditable } from "@/lib/validation/venta";

export default async function EditarVentaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const venta = await prisma.venta.findUnique({
    where: { id },
    include: { cliente: true, evento: true },
  });
  if (!venta) notFound();

  if (!esVentaEditable(venta)) {
    return (
      <div>
        <PageHeader title="Editar venta" />
        <EmptyState
          title="Esta venta no se puede editar"
          subtitle="Las ventas de Tiendup y las de liquidación de concesión vienen de su origen; editarlas acá las desincronizaría."
        />
        <Link href={`/ventas/${id}`} className="btn-secondary text-sm mt-4 inline-flex">
          ← Volver a la venta
        </Link>
      </div>
    );
  }

  const [clientes, productos, eventos] = await Promise.all([
    // Los mismos que ofrece el alta, mas el cliente actual de la venta.
    prisma.cliente.findMany({
      where: {
        OR: [
          { tipo: { in: ["MAYORISTA", "DISTRIBUIDOR"] } },
          ...(venta.clienteId ? [{ id: venta.clienteId }] : []),
        ],
      },
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
      select: { id: true, nombre: true, apellido: true, tipo: true },
    }),
    prisma.producto.findMany({ orderBy: { nombre: "asc" } }),
    prisma.evento.findMany({ orderBy: { fecha: "desc" }, take: 20 }),
  ]);

  // El evento de la venta puede ser mas viejo que los 20 recientes: sin esto
  // el selector lo mostraria vacio y guardar lo desvincularia.
  const opcionesEventos = eventos.map((e) => ({ id: e.id, nombre: e.nombre }));
  if (venta.evento && !opcionesEventos.some((e) => e.id === venta.evento!.id)) {
    opcionesEventos.push({ id: venta.evento.id, nombre: venta.evento.nombre });
  }

  return (
    <div>
      <PageHeader
        title="Editar venta"
        subtitle={venta.cliente ? nombreCliente(venta.cliente) : "Venta rápida"}
      />
      <VentaForm
        clientes={clientes}
        productos={productos}
        eventos={opcionesEventos}
        venta={{
          id: venta.id,
          clienteId: venta.clienteId,
          productoId: venta.productoId,
          cantidad: venta.cantidad,
          precioUnitario: venta.precioUnitario.toNumber(),
          precioTotal: venta.precioTotal.toNumber(),
          montoCobrado: venta.montoCobrado.toNumber(),
          eventoId: venta.eventoId,
          fecha: fechaInputValue(venta.fecha),
        }}
      />
    </div>
  );
}
