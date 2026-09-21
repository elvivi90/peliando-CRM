import { Bone, SkeletonFiltros, SkeletonHeader, SkeletonRoot, SkeletonTable } from "@/components/ui/skeleton";
import { CargandoOverlay } from "@/components/ui/cargando-overlay";

export default function Loading() {
  return (
    <>
      <SkeletonRoot>
        <SkeletonHeader subtitle action />

        <div className="flex flex-wrap gap-4 mb-5 items-end">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1.5">
              <Bone className="h-3 w-14" />
              <Bone className="h-11 w-56 rounded-xl" />
            </div>
            <Bone className="h-10 w-20 rounded-xl" />
          </div>
          <SkeletonFiltros cantidad={4} className="" />
        </div>

        <SkeletonTable
          filas={8}
          columnas={[
            { ancho: "w-40" },
            { ancho: "w-24", pill: true },
            { ancho: "w-44", ocultar: "sm" },
          ]}
        />
      </SkeletonRoot>
      <CargandoOverlay />
    </>
  );
}
