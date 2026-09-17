import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StockEditor } from "@/components/productos/stock-editor";

export default async function ProductosPage() {
  const productos = await prisma.producto.findMany({ orderBy: { nombre: "asc" } });

  return (
    <div>
      <PageHeader
        title="Productos"
        action={
          <Link href="/productos/nuevo" className="btn-primary text-sm">
            + Nuevo producto
          </Link>
        }
      />

      {productos.length === 0 ? (
        <EmptyState title="Todavía no hay productos cargados" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {productos.map((p) => (
            <div key={p.id} className="card-chunky p-5">
              <h2 className="font-black text-lg">{p.nombre}</h2>
              {p.descripcion && <p className="text-sm text-navy/60 mt-1">{p.descripcion}</p>}
              <div className="mt-4">
                <div className="text-xs font-bold text-navy/50 uppercase">Stock actual</div>
                <StockEditor productoId={p.id} stockActual={p.stockActual} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
