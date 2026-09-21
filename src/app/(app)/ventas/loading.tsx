import { SkeletonFiltros, SkeletonHeader, SkeletonRoot, SkeletonTable } from "@/components/ui/skeleton";
import { CargandoOverlay } from "@/components/ui/cargando-overlay";

export default function Loading() {
  return (
    <>
      <SkeletonRoot>
        <SkeletonHeader subtitle action />
        <SkeletonFiltros cantidad={5} />
        <SkeletonTable
          filas={8}
          columnas={[
            { ancho: "w-20" },
            { ancho: "w-36" },
            { ancho: "w-24", pill: true },
            { ancho: "w-8" },
            { ancho: "w-20" },
            { ancho: "w-28", ocultar: "md" },
          ]}
        />
      </SkeletonRoot>
      <CargandoOverlay />
    </>
  );
}
