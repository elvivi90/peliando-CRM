import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { TipoBadge } from "@/components/ui/badge";
import { BotonEliminar } from "@/components/ui/boton-eliminar";
import { formatDate, formatMoney, nombreCliente } from "@/lib/format";
import { EntregaCobroPanel } from "@/components/ventas/entrega-cobro-panel";
import { getCurrentUsuario, esAdminPrincipal } from "@/lib/auth";
import { eliminarVenta } from "@/app/(app)/ventas/actions";
import { esVentaEditable } from "@/lib/validation/venta";

export default async function VentaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const venta = await prisma.venta.findUnique({
    where: { id },
    include: {
      cliente: true,
      producto: true,
      usuario: true,
      evento: true,
      tramo: true,
      entregas: { orderBy: { fecha: "desc" } },
    },
  });

  if (!venta) notFound();

  const usuario = await getCurrentUsuario();
  const puedeEliminar = esAdminPrincipal(usuario);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <PageHeader
        title={venta.cliente ? `Venta a ${nombreCliente(venta.cliente)}` : "Venta rápida"}
        subtitle={formatDate(venta.fecha)}
        action={
          <div className="flex items-center gap-2">
            <TipoBadge tipo={venta.tipo} />
            {esVentaEditable(venta) && (
              <Link href={`/ventas/${venta.id}/editar`} className="btn-secondary text-sm">
                Editar
              </Link>
            )}
            {puedeEliminar && (
              <BotonEliminar entidad="esta venta" onEliminar={eliminarVenta.bind(null, venta.id)} />
            )}
          </div>
        }
      />

      <div className="card-chunky p-5 grid grid-cols-2 gap-4">
        <Info label="Producto" value={venta.producto.nombre} />
        <Info
          label="Cliente"
          value={
            venta.cliente ? (
              <Link href={`/clientes/${venta.clienteId}`} className="hover:underline">
                {nombreCliente(venta.cliente)}
              </Link>
            ) : (
              "Sin cliente"
            )
          }
        />
        <Info label="Cantidad" value={String(venta.cantidad)} />
        <Info label="Entregado" value={`${venta.cantidadEntregada} / ${venta.cantidad}`} />
        <Info label="Precio unitario" value={formatMoney(venta.precioUnitario)} />
        <Info label="Precio total" value={formatMoney(venta.precioTotal)} />
        <Info label="Cobrado" value={`${formatMoney(venta.montoCobrado)} / ${formatMoney(venta.precioTotal)}`} />
        <Info label="Evento" value={venta.evento?.nombre ?? "—"} />
        <Info label="Cargada por" value={venta.usuario.nombre} />
        <Info label="Origen" value={venta.origen === "WEBHOOK_TIENDUP" ? "Tiendup (automática)" : "Manual"} />
        {venta.descripcion && (
          <div className="col-span-2">
            <Info label="Descripción" value={venta.descripcion} />
          </div>
        )}
      </div>

      <EntregaCobroPanel
        ventaId={venta.id}
        cantidad={venta.cantidad}
        cantidadEntregada={venta.cantidadEntregada}
        precioTotal={venta.precioTotal.toNumber()}
        montoCobrado={venta.montoCobrado.toNumber()}
      />

      {venta.entregas.length > 0 && (
        <div className="card-chunky p-5">
          <h2 className="font-extrabold text-sm uppercase tracking-wide text-navy/60 mb-3">
            Historial de entregas
          </h2>
          <ul className="flex flex-col gap-2">
            {venta.entregas.map((e) => (
              <li key={e.id} className="flex justify-between text-sm border-t border-navy/10 pt-2 first:border-0 first:pt-0">
                <span>{formatDate(e.fecha)}</span>
                <span className="font-bold">{e.cantidad} un.</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-bold text-navy/50 uppercase">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
