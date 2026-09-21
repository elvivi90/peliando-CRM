import { Bone, SkeletonHeader, SkeletonRoot, SkeletonTable } from "@/components/ui/skeleton";
import { CargandoOverlay } from "@/components/ui/cargando-overlay";

export default function Loading() {
  return (
    <>
      <SkeletonRoot className="flex flex-col gap-6">
        <SkeletonHeader subtitle />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="card-chunky p-4">
              <Bone className="h-2.5 w-14" />
              <Bone className="h-6 w-24 mt-2" />
            </div>
          ))}
        </div>

        <SkeletonTable
          titulo
          compacta
          filas={4}
          columnas={[{ ancho: "w-32" }, { ancho: "w-24", pill: true }, { ancho: "w-8" }, { ancho: "w-20" }]}
        />
        <SkeletonTable
          titulo
          compacta
          filas={3}
          columnas={[{ ancho: "w-36" }, { ancho: "w-24" }, { ancho: "w-20" }]}
        />
      </SkeletonRoot>
      <CargandoOverlay />
    </>
  );
}
