import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { TipoBadge } from "@/components/ui/badge";
import { BotonEliminar } from "@/components/ui/boton-eliminar";
import { FORMA_PAGO_LABEL, formatDate, formatMoney, nombreCliente } from "@/lib/format";
import { FechaHora } from "@/components/ui/fecha-hora";
import { EntregaCobroPanel } from "@/components/ventas/entrega-cobro-panel";
import { getCurrentUsuario, esAdminPrincipal } from "@/lib/auth";
import { eliminarVenta } from "@/app/(app)/ventas/actions";
import { PagoPanel, PagoTiendup } from "@/components/ventas/pago-panel";
import { EnvioVenta, EnvioVentaCargando } from "@/components/ventas/envio-venta";
import { EnvioPanel } from "@/components/ventas/envio-panel";

const TIPO_LABEL: Record<string, string> = {
  MINORISTA: "Minorista",
  MAYORISTA: "Mayorista",
  DISTRIBUIDOR: "Distribuidor",
};

// Como se genero la venta: Tiendup (automatica), una venta rapida sin
// cliente, una liquidacion de concesion o una carga manual a un cliente.
function origenVenta(venta: { origen: string; tipo: string; clienteId: string | null }) {
  if (venta.origen === "WEBHOOK_TIENDUP") return "Tiendup (automática)";
  if (venta.tipo === "CONCESION") return "Liquidación de concesión";
  if (!venta.clienteId) return "Venta rápida";
  return `Manual · ${TIPO_LABEL[venta.tipo] ?? venta.tipo}`;
}

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
      envio: true,
      pagoMercadoPago: true,
    },
  });

  if (!venta) notFound();

  const usuario = await getCurrentUsuario();
  const puedeEliminar = esAdminPrincipal(usuario);
  const cliente = venta.cliente;
  const nombre = cliente ? nombreCliente(cliente) : null;
  // Los clientes de Tiendup no guardan el telefono: sale del envio.
  const telefono = cliente?.telefono || venta.envio?.destinatarioTelefono || null;
  const envio = venta.envio
    ? {
        ...venta.envio,
        destinatarioTelefono: venta.envio.destinatarioTelefono ?? "",
        piso: venta.envio.piso ?? "",
        departamento: venta.envio.departamento ?? "",
        barrio: venta.envio.barrio ?? "",
        costoEnvioReal: venta.envio.costoEnvioReal?.toNumber() ?? null,
      }
    : null;

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <PageHeader
        title="Detalle de la venta"
        subtitle={<FechaHora value={venta.fecha} />}
        action={
          <div className="flex items-center gap-2">
            <TipoBadge tipo={venta.tipo} />
            <Link href={`/ventas/${venta.id}/editar`} className="btn-secondary text-sm">
              Editar
            </Link>
            {puedeEliminar && (
              <BotonEliminar entidad="esta venta" onEliminar={eliminarVenta.bind(null, venta.id)} />
            )}
          </div>
        }
      />

      <div className="card-chunky p-5 grid grid-cols-2 gap-4">
        {cliente ? (
          <>
            <div className="col-span-2">
              <Info
                label="Cliente"
                value={
                  <Link href={`/clientes/${venta.clienteId}`} className="hover:underline">
                    {nombre}
                  </Link>
                }
              />
            </div>
            <Info label="Teléfono" value={telefono ?? "—"} />
            <Info label="Email" value={cliente.email ?? "—"} />
          </>
        ) : null}
        <Info label="Origen" value={origenVenta(venta)} />
        <Info label="Cargada por" value={venta.usuario.nombre} />
        <Info label="Producto" value={venta.producto.nombre} />
        <Info
          label="Cantidad"
          value={
            venta.cantidadEntregada < venta.cantidad
              ? `${venta.cantidad} (${venta.cantidadEntregada} entregadas)`
              : String(venta.cantidad)
          }
        />
        {/* Siempre presente, aunque este vacia, para que Total quede debajo de Cantidad. */}
        <Info label="Descripción" value={venta.descripcion || "—"} />
        <Info
          label="Total"
          value={
            venta.cantidad > 1
              ? `${formatMoney(venta.precioTotal)} (${formatMoney(venta.precioUnitario)} c/u)`
              : formatMoney(venta.precioTotal)
          }
        />
        {venta.evento && <Info label="Evento" value={venta.evento.nombre} />}
        {/* Costo de un envio cargado a mano (sin envio por Correo). */}
        {!venta.envio && venta.costoEnvio.gt(0) && (
          <Info label="Costo de envío" value={formatMoney(venta.costoEnvio)} />
        )}
      </div>

      {/* Venta de Tiendup sin cobro de Mercado Pago ni forma de pago guardada:
          el medio se consulta en la orden. */}
      {venta.tiendupOrderId !== null && !venta.pagoMercadoPago && !venta.formaPago ? (
        <Suspense
          fallback={
            <PagoPanel precioTotal={venta.precioTotal} montoCobrado={venta.montoCobrado} pago={null} />
          }
        >
          <PagoTiendup
            tiendupOrderId={venta.tiendupOrderId}
            precioTotal={venta.precioTotal}
            montoCobrado={venta.montoCobrado}
          />
        </Suspense>
      ) : (
        <PagoPanel
          precioTotal={venta.precioTotal}
          montoCobrado={venta.montoCobrado}
          pago={venta.pagoMercadoPago}
          medioPago={venta.formaPago ? FORMA_PAGO_LABEL[venta.formaPago] : null}
        />
      )}

      {venta.tiendupOrderId !== null ? (
        <Suspense fallback={<EnvioVentaCargando envio={envio} />}>
          <EnvioVenta tiendupOrderId={venta.tiendupOrderId} envio={envio} nombreCliente={nombre} />
        </Suspense>
      ) : (
        envio && <EnvioPanel envio={envio} nombreCliente={nombre} />
      )}

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
    <div className="min-w-0">
      <div className="text-xs font-bold text-navy/50 uppercase">{label}</div>
      <div className="font-semibold break-words">{value}</div>
    </div>
  );
}
