import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { VentaForm } from "@/components/ventas/venta-form";
import { EmptyState } from "@/components/ui/empty-state";

export default async function NuevaVentaPage() {
  const [clientes, productos, eventos, listaActiva] = await Promise.all([
    // Solo los que se pueden elegir en el flujo mayorista/distribuidor.
    prisma.cliente.findMany({
      where: { tipo: { in: ["MAYORISTA", "DISTRIBUIDOR"] } },
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
      select: { id: true, nombre: true, apellido: true, tipo: true },
    }),
    prisma.producto.findMany({ orderBy: { nombre: "asc" } }),
    prisma.evento.findMany({ orderBy: { fecha: "desc" }, take: 20 }),
    prisma.listaDePrecios.findFirst({ where: { estado: "ACTIVA" } }),
  ]);

  return (
    <div>
      <PageHeader title="Nueva venta" />

      {!listaActiva && (
        <div className="mb-5">
          <EmptyState
            title="No hay ninguna lista de precios activa"
            subtitle="Creá una lista de precios antes de cargar ventas mayoristas o distribuidor."
          />
          <Link href="/precios/nueva" className="btn-primary text-sm mt-4 inline-flex">
            + Crear lista de precios
          </Link>
        </div>
      )}

      {productos.length === 0 ? (
        <EmptyState
          title="No hay productos cargados"
          subtitle="Necesitás al menos un producto para poder registrar ventas."
        />
      ) : (
        <VentaForm
          clientes={clientes}
          productos={productos}
          eventos={eventos.map((e) => ({ id: e.id, nombre: e.nombre }))}
        />
      )}
    </div>
  );
}
