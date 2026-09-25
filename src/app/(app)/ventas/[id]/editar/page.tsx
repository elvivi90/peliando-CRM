import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { VentaForm } from "@/components/ventas/venta-form";
import { fechaInputValue } from "@/lib/date";
import { nombreCliente } from "@/lib/format";
import { saldoConcesion } from "@/lib/services/concesion";

export default async function EditarVentaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const venta = await prisma.venta.findUnique({
    where: { id },
    include: {
      cliente: true,
      evento: true,
      liquidacionConcesion: {
        include: { concesion: { include: { liquidaciones: true, devoluciones: true } } },
      },
    },
  });
  if (!venta) notFound();

  const [clientes, productos, eventos] = await Promise.all([
    // Los mismos que ofrece el alta, mas el cliente actual de la venta (una
    // venta de Tiendup tiene un cliente minorista).
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

  // Liquidacion de concesion: tope de unidades = lo que queda en la
  // concesion + lo que ya liquida esta venta.
  const liquidacion = venta.liquidacionConcesion;
  const concesion =
    venta.tipo === "CONCESION"
      ? {
          maxCantidad: liquidacion
            ? saldoConcesion(liquidacion.concesion) + liquidacion.cantidadVendida
            : null,
        }
      : null;

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
          tipo: venta.tipo,
          clienteId: venta.clienteId,
          productoId: venta.productoId,
          cantidad: venta.cantidad,
          precioUnitario: venta.precioUnitario.toNumber(),
          precioTotal: venta.precioTotal.toNumber(),
          montoCobrado: venta.montoCobrado.toNumber(),
          costoEnvio: venta.costoEnvio.toNumber(),
          eventoId: venta.eventoId,
          fecha: fechaInputValue(venta.fecha),
          concesion,
        }}
      />
    </div>
  );
}
