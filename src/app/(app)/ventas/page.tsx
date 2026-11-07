import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { EnvioBadge, TipoBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney, nombreCliente } from "@/lib/format";
import { FechaHora } from "@/components/ui/fecha-hora";
import { ponerAlDiaConTiendup } from "@/lib/services/envios";
import type { TipoVenta } from "@prisma/client";

const TIPOS: { value: TipoVenta | ""; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "MINORISTA", label: "Minorista" },
  { value: "MAYORISTA", label: "Mayorista" },
  { value: "DISTRIBUIDOR", label: "Distribuidor" },
  { value: "CONCESION", label: "Concesión" },
];

const FILTRO_ACTIVO = "px-3.5 py-2 rounded-xl bg-tarjeta border-2 border-navy text-xs font-extrabold";
const FILTRO_INACTIVO = "px-3.5 py-2 rounded-xl text-xs font-bold opacity-55 hover:opacity-100";

/**
 * Lo que muestra la columna Envío: el estado del envio por Correo si lo
 * hay; si no, si la venta ya se entrego o como falta entregarla. Una venta
 * de Tiendup sin localidad de envio es un retiro en sucursal (las que no
 * llevan envio se crean entregadas); con localidad y sin envio de Correo es
 * una entrega del equipo (La Plata).
 */
function estadoEntrega(v: {
  envio: { estado: string } | null;
  cantidad: number;
  cantidadEntregada: number;
  origen: string;
  envioLocalidad: string | null;
}) {
  if (v.envio) return v.envio.estado;
  if (v.cantidadEntregada >= v.cantidad) return "ENTREGADO";
  if (v.origen === "WEBHOOK_TIENDUP") return v.envioLocalidad ? "POR_ENVIAR" : "A_RETIRAR";
  return "POR_ENTREGAR";
}

export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; pendientes?: string }>;
}) {
  const { tipo, pendientes } = await searchParams;
  const soloPendientes = pendientes === "1";

  const ventas = await prisma.venta.findMany({
    where: {
      tipo: tipo ? (tipo as TipoVenta) : undefined,
      cantidadEntregada: soloPendientes ? { lt: prisma.venta.fields.cantidad } : undefined,
    },
    orderBy: { fecha: "desc" },
    take: 100,
    include: {
      cliente: true,
      producto: true,
      evento: true,
      envio: { select: { id: true, estado: true, trackingNumber: true } },
    },
  });
  // Lo que el equipo ya despacho o entrego en Tiendup se ve aca sin esperar
  // al cron. Tambien trae la sucursal de los retiros pendientes.
  const sucursales = await ponerAlDiaConTiendup(ventas);

  return (
    <div>
      <PageHeader
        title="Ventas"
        subtitle={`${ventas.length} venta${ventas.length === 1 ? "" : "s"}${soloPendientes ? " pendientes de entrega" : ""} (últimas 100)`}
        action={
          <Link href="/ventas/nueva" className="btn-primary text-sm">
            + Nueva venta
          </Link>
        }
      />

      <div className="flex gap-1.5 flex-wrap mb-5">
        {TIPOS.map((t) => (
          <Link
            key={t.value}
            href={`/ventas${t.value ? `?tipo=${t.value}` : ""}`}
            className={
              !soloPendientes && (tipo ?? "") === t.value ? FILTRO_ACTIVO : FILTRO_INACTIVO
            }
          >
            {t.label}
          </Link>
        ))}
        <Link
          href="/ventas?pendientes=1"
          className={`${soloPendientes ? FILTRO_ACTIVO : FILTRO_INACTIVO} sm:ml-auto`}
        >
          ⏳ Pendientes de entrega
        </Link>
      </div>

      {ventas.length === 0 ? (
        <EmptyState
          title={soloPendientes ? "No hay ventas pendientes de entrega" : "Todavía no hay ventas registradas"}
        />
      ) : (
        <div className="card-chunky overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-navy/15 text-left">
                  <th className="px-5 py-3 font-extrabold text-xs uppercase tracking-wide text-navy/60">
                    Fecha
                  </th>
                  <th className="px-5 py-3 font-extrabold text-xs uppercase tracking-wide text-navy/60">
                    Cliente
                  </th>
                  <th className="px-5 py-3 font-extrabold text-xs uppercase tracking-wide text-navy/60">
                    Tipo
                  </th>
                  <th className="px-5 py-3 font-extrabold text-xs uppercase tracking-wide text-navy/60">
                    Cant.
                  </th>
                  <th className="px-5 py-3 font-extrabold text-xs uppercase tracking-wide text-navy/60">
                    Total
                  </th>
                  <th className="px-5 py-3 font-extrabold text-xs uppercase tracking-wide text-navy/60">
                    Envío
                  </th>
                  <th className="px-5 py-3 font-extrabold text-xs uppercase tracking-wide text-navy/60 hidden md:table-cell">
                    Evento
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {ventas.map((v) => (
                  // Toda la fila abre el detalle: el link del cliente se estira
                  // sobre la fila (after:inset-0) y Editar queda por encima.
                  <tr
                    key={v.id}
                    className="relative border-b border-navy/10 last:border-0 hover:bg-navy/5"
                  >
                    <td className="px-5 py-3 text-navy/70 whitespace-nowrap"><FechaHora value={v.fecha} /></td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/ventas/${v.id}`}
                        className="font-bold after:absolute after:inset-0"
                      >
                        {nombreCliente(v.cliente)}
                      </Link>
                      {v.cliente?.email && (
                        <div className="text-xs text-navy/60 break-all">{v.cliente.email}</div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <TipoBadge tipo={v.tipo} />
                    </td>
                    <td className="px-5 py-3">
                      {v.cantidad}
                    </td>
                    <td className="px-5 py-3 font-bold whitespace-nowrap">
                      {formatMoney(v.precioTotal)}
                      {v.montoCobrado.lt(v.precioTotal) && (
                        <span className="text-rosa text-xs font-bold ml-1" title="Cobro pendiente">
                          ⏳
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <EnvioBadge estado={estadoEntrega(v)} detalle={sucursales.get(v.id)} />
                    </td>
                    <td className="px-5 py-3 text-navy/60 hidden md:table-cell">
                      {v.evento?.nombre ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <Link
                        href={`/ventas/${v.id}/editar`}
                        className="relative z-10 text-xs font-bold text-navy/70 hover:underline"
                      >
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
