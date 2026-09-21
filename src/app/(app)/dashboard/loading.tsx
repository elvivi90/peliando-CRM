import { Bone, SkeletonCard, SkeletonRoot, SkeletonStatCards } from "@/components/ui/skeleton";
import { CargandoOverlay } from "@/components/ui/cargando-overlay";

export default function Loading() {
  return (
    <>
      <SkeletonRoot className="flex flex-col gap-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Bone className="h-8 w-56" />
          <Bone className="h-4 w-44" />
        </div>

        <SkeletonStatCards />

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5">
          <SkeletonCard className="lg:p-6 flex flex-col">
            <Bone className="h-3 w-28 mb-2" />
            <Bone className="h-4 w-64 max-w-full mb-4" />
            <Bone className="h-56 lg:h-64 rounded-xl" />
          </SkeletonCard>

          <SkeletonCard className="lg:p-6 flex flex-col">
            <Bone className="h-3 w-28 mb-4" />
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }, (_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 pb-3 border-b-2 border-navy/10 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-2.5">
                    <Bone className="h-2.5 w-2.5 rounded-full" />
                    <div>
                      <Bone className="h-4 w-32" />
                      <Bone className="h-3 w-24 mt-1.5" />
                    </div>
                  </div>
                  <Bone className="h-4 w-16" />
                </div>
              ))}
            </div>
          </SkeletonCard>
        </div>

        <SkeletonCard>
          <Bone className="h-3 w-56 mb-4" />
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b border-navy/10 pb-2.5 last:border-0 last:pb-0"
              >
                <Bone className="h-4 w-40" />
                <Bone className="h-4 w-28" />
              </div>
            ))}
          </div>
        </SkeletonCard>
      </SkeletonRoot>
      <CargandoOverlay />
    </>
  );
}
