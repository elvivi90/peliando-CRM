// Bloques base de los skeletons de carga. Cada uno calca las clases del
// componente real que reemplaza (PageHeader, StatCard, tablas, formularios),
// asi el esqueleto ocupa el mismo lugar que la pantalla y no hay saltos de
// layout cuando llega el contenido. Las pantallas los componen en su propio
// loading.tsx segun como esta armada cada una.

export function Bone({ className = "" }: { className?: string }) {
  return <div className={`rounded-lg bg-navy/10 ${className}`} />;
}

// Raiz de un skeleton: pulsa y se oculta a lectores de pantalla (el aviso de
// "Cargando..." lo da CargandoOverlay).
export function SkeletonRoot({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div aria-hidden className={`animate-pulse ${className}`}>
      {children}
    </div>
  );
}

// Calca PageHeader: titulo (+ subtitulo) a la izquierda, accion a la derecha.
export function SkeletonHeader({
  subtitle = false,
  action = false,
  actionWidth = "w-36",
}: {
  subtitle?: boolean;
  action?: boolean;
  actionWidth?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
      <div>
        <Bone className="h-8 w-48" />
        {subtitle && <Bone className="h-4 w-72 max-w-full mt-2.5" />}
      </div>
      {action && <Bone className={`h-10 ${actionWidth} rounded-xl`} />}
    </div>
  );
}

// Calca StatCard: franja de color arriba + etiqueta, valor y detalle.
export function SkeletonStatCards({ count = 4, hint = true }: { count?: number; hint?: boolean }) {
  return (
    <div className="flex flex-wrap gap-4 lg:gap-5">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex-1 min-w-[150px] card-chunky overflow-hidden">
          <div className="h-[7px] bg-navy/10" />
          <div className="px-5 py-4">
            <Bone className="h-3 w-20" />
            <Bone className="h-7 w-28 mt-2.5" />
            {hint && <Bone className="h-3 w-24 mt-2.5" />}
          </div>
        </div>
      ))}
    </div>
  );
}

export type ColumnaSkeleton = {
  // ancho de la barra de la celda
  ancho?: string;
  // celda con forma de badge (Tipo)
  pill?: boolean;
  // oculta la columna en pantallas chicas, igual que la tabla real
  ocultar?: "sm" | "md";
};

const OCULTAR = { sm: "hidden sm:table-cell", md: "hidden md:table-cell" } as const;

// Calca las tablas reales: card-chunky con encabezado y filas.
export function SkeletonTable({
  columnas,
  filas = 8,
  titulo = false,
  compacta = false,
}: {
  columnas: ColumnaSkeleton[];
  filas?: number;
  // titulo de seccion arriba de la tabla (como en el detalle de un evento)
  titulo?: boolean;
  compacta?: boolean;
}) {
  const py = compacta ? "py-2.5" : "py-3";
  return (
    <div className="card-chunky overflow-hidden">
      {titulo && <Bone className="h-4 w-24 mx-5 mt-5 mb-3" />}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-navy/15 text-left">
              {columnas.map((c, i) => (
                <th key={i} className={`px-5 ${py} ${c.ocultar ? OCULTAR[c.ocultar] : ""}`}>
                  <Bone className="h-3 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: filas }, (_, r) => (
              <tr key={r} className="border-b border-navy/10 last:border-0">
                {columnas.map((c, i) => (
                  <td key={i} className={`px-5 ${py} ${c.ocultar ? OCULTAR[c.ocultar] : ""}`}>
                    <Bone
                      className={`h-4 ${c.ancho ?? "w-24"} ${c.pill ? "h-6 rounded-full" : ""} ${
                        r % 2 ? "opacity-80" : ""
                      }`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Fila de chips de filtro (Todos / Minorista / ...), como en Ventas y Clientes.
export function SkeletonFiltros({ cantidad = 5, className = "mb-5" }: { cantidad?: number; className?: string }) {
  return (
    <div className={`flex gap-1.5 flex-wrap ${className}`}>
      {Array.from({ length: cantidad }, (_, i) => (
        <Bone key={i} className="h-8 w-20 rounded-xl" />
      ))}
    </div>
  );
}

// Un campo de formulario: etiqueta + input.
export function SkeletonCampo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Bone className="h-3 w-24" />
      <Bone className="h-11 w-full rounded-xl" />
    </div>
  );
}

// Formulario de alta/edicion: card con campos y boton. `filas` indica cuantos
// campos van lado a lado en cada fila (1 = ancho completo, 2 = de a dos).
export function SkeletonFormulario({
  filas,
  ancho = "max-w-lg",
}: {
  filas: (1 | 2)[];
  ancho?: string;
}) {
  return (
    <div className={`card-chunky p-6 flex flex-col gap-4 ${ancho}`}>
      {filas.map((n, i) =>
        n === 1 ? (
          <SkeletonCampo key={i} />
        ) : (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SkeletonCampo />
            <SkeletonCampo />
          </div>
        ),
      )}
      <Bone className="h-11 w-36 rounded-xl mt-1" />
    </div>
  );
}

// Card generica con etiqueta de seccion y contenido.
export function SkeletonCard({
  className = "",
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return <div className={`card-chunky p-5 ${className}`}>{children}</div>;
}
