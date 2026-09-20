import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { TipoBadge } from "@/components/ui/badge";
import { Comentarios } from "@/components/clientes/comentarios";
import { formatDate, formatMoney } from "@/lib/format";
import { getCuentaCorriente } from "@/lib/services/cuenta-corriente";
import { NuevaEntregaForm } from "@/components/concesion/nueva-entrega-form";

export default async function ClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      listaPrecio: true,
      comentarios: { orderBy: { fecha: "desc" }, include: { usuario: true } },
      concesiones: {
        include: { producto: true, liquidaciones: true, devoluciones: true },
        orderBy: { fechaEntrega: "desc" },
      },
    },
  });

  if (!cliente) notFound();

  const ventas = await prisma.venta.findMany({
    where: { clienteId: id },
    orderBy: { fecha: "desc" },
    take: 20,
    include: { producto: true },
  });

  const esMayorista = cliente.tipo === "MAYORISTA";
  const productos = esMayorista ? await prisma.producto.findMany({ orderBy: { nombre: "asc" } }) : [];

  const tieneCuentaCorriente = cliente.tipo === "MAYORISTA" || cliente.tipo === "DISTRIBUIDOR";
  const cuentaCorriente = tieneCuentaCorriente ? await getCuentaCorriente(id) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${cliente.nombre} ${cliente.apellido}`}
        subtitle={cliente.email || cliente.telefono || undefined}
        action={
          <Link href={`/clientes/${id}/editar`} className="btn-secondary text-sm">
            Editar
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="card-chunky p-5">
            <div className="flex items-center gap-3 mb-4">
              <TipoBadge tipo={cliente.tipo} />
              {cliente.precioParticular && (
                <span className="text-sm font-bold text-navy/70">
                  Precio particular: {formatMoney(cliente.precioParticular)}
                </span>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Detail label="Email" value={cliente.email} />
              <Detail label="Teléfono" value={cliente.telefono} />
              <Detail label="Dirección" value={cliente.direccion} />
              <Detail
                label="Lista de precios"
                value={cliente.listaPrecio ? cliente.listaPrecio.nombre : "Activa por defecto"}
              />
            </dl>
          </div>

          {tieneCuentaCorriente && cuentaCorriente && (
            <div className="card-chunky p-5">
              <h2 className="font-extrabold text-sm uppercase tracking-wide text-navy/60 mb-4">
                Cuenta corriente
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs font-bold text-navy/50 uppercase">
                    Unidades pendientes de entrega
                  </div>
                  <div className="text-2xl font-black mt-1">
                    {cuentaCorriente.cantidadPendienteEntrega}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-navy/50 uppercase">Saldo pendiente de cobro</div>
                  <div
                    className={`text-2xl font-black mt-1 ${cuentaCorriente.saldoPendienteCobro.gt(0) ? "text-rosa" : ""}`}
                  >
                    {formatMoney(cuentaCorriente.saldoPendienteCobro)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {esMayorista && (
            <div className="card-chunky p-5">
              <h2 className="font-extrabold text-sm uppercase tracking-wide text-navy/60 mb-4">
                Concesión
              </h2>
              {cliente.concesiones.length === 0 ? (
                <p className="text-sm text-navy/50">Sin entregas en concesión todavía.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {cliente.concesiones.map((c) => {
                    const liquidado = c.liquidaciones.reduce((s, l) => s + l.cantidadVendida, 0);
                    const devuelto = c.devoluciones.reduce((s, d) => s + d.cantidad, 0);
                    const saldo = c.cantidadEntregada - liquidado - devuelto;
                    return (
                      <li key={c.id} className="border-t-2 border-navy/10 pt-3 first:border-0 first:pt-0">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm">{c.producto.nombre}</span>
                          <span className="text-xs text-navy/50">{formatDate(c.fechaEntrega)}</span>
                        </div>
                        <p className="text-xs text-navy/60 mt-1">
                          Entregado {c.cantidadEntregada} · Liquidado {liquidado} · Devuelto {devuelto} ·{" "}
                          <span className="font-extrabold text-navy">Saldo {saldo}</span>
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="flex flex-wrap items-start gap-3">
                <NuevaEntregaForm clienteId={id} productos={productos} />
                {cliente.concesiones.length > 0 && (
                  <Link href="/concesion" className="btn-secondary text-sm mt-4 inline-flex">
                    Liquidar / devolver
                  </Link>
                )}
              </div>
            </div>
          )}

          <div className="card-chunky overflow-hidden">
            <h2 className="font-extrabold text-sm uppercase tracking-wide text-navy/60 px-5 pt-5">
              Historial de ventas
            </h2>
            {ventas.length === 0 ? (
              <p className="text-sm text-navy/50 px-5 py-5">Sin ventas registradas.</p>
            ) : (
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-navy/15 text-left">
                      <th className="px-5 py-2.5 font-extrabold text-xs uppercase tracking-wide text-navy/60">
                        Fecha
                      </th>
                      <th className="px-5 py-2.5 font-extrabold text-xs uppercase tracking-wide text-navy/60">
                        Producto
                      </th>
                      <th className="px-5 py-2.5 font-extrabold text-xs uppercase tracking-wide text-navy/60">
                        Cant.
                      </th>
                      <th className="px-5 py-2.5 font-extrabold text-xs uppercase tracking-wide text-navy/60">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventas.map((v) => (
                      <tr key={v.id} className="border-b border-navy/10 last:border-0">
                        <td className="px-5 py-2.5 text-navy/70">{formatDate(v.fecha)}</td>
                        <td className="px-5 py-2.5">{v.producto.nombre}</td>
                        <td className="px-5 py-2.5">
                          {v.cantidad}
                          {v.cantidadEntregada < v.cantidad && (
                            <span className="text-rosa text-xs font-bold ml-1">
                              ({v.cantidadEntregada} entreg.)
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-2.5 font-bold">{formatMoney(v.precioTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div>
          <Comentarios clienteId={id} comentarios={cliente.comentarios} />
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-bold text-navy/50 uppercase">{label}</dt>
      <dd className="font-semibold">{value || "—"}</dd>
    </div>
  );
}
