import { Bone, SkeletonCard, SkeletonHeader, SkeletonRoot, SkeletonTable } from "@/components/ui/skeleton";
import { CargandoOverlay } from "@/components/ui/cargando-overlay";

export default function Loading() {
  return (
    <>
      <SkeletonRoot className="flex flex-col gap-6">
        <SkeletonHeader subtitle action actionWidth="w-20" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <SkeletonCard>
              <div className="flex items-center gap-3 mb-4">
                <Bone className="h-6 w-24 rounded-full" />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i}>
                    <Bone className="h-3 w-16" />
                    <Bone className="h-4 w-32 mt-1.5" />
                  </div>
                ))}
              </div>
            </SkeletonCard>

            <SkeletonCard>
              <Bone className="h-3 w-32 mb-4" />
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 2 }, (_, i) => (
                  <div key={i}>
                    <Bone className="h-3 w-36" />
                    <Bone className="h-8 w-20 mt-2" />
                  </div>
                ))}
              </div>
            </SkeletonCard>

            <SkeletonTable
              titulo
              compacta
              filas={5}
              columnas={[{ ancho: "w-20" }, { ancho: "w-32" }, { ancho: "w-8" }, { ancho: "w-20" }]}
            />
          </div>

          <SkeletonCard className="flex flex-col gap-3">
            <Bone className="h-3 w-28" />
            <Bone className="h-20 rounded-xl" />
            <Bone className="h-9 w-28 rounded-xl" />
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="border-t-2 border-navy/10 pt-3">
                <Bone className="h-3 w-32" />
                <Bone className="h-4 w-full mt-1.5" />
              </div>
            ))}
          </SkeletonCard>
        </div>
      </SkeletonRoot>
      <CargandoOverlay />
    </>
  );
}
