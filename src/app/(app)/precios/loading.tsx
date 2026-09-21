import { Bone, SkeletonCard, SkeletonHeader, SkeletonRoot } from "@/components/ui/skeleton";
import { CargandoOverlay } from "@/components/ui/cargando-overlay";

export default function Loading() {
  return (
    <>
      <SkeletonRoot>
        <SkeletonHeader subtitle action actionWidth="w-36" />
        <div className="flex flex-col gap-5">
          {Array.from({ length: 2 }, (_, i) => (
            <SkeletonCard key={i}>
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <div className="flex items-center gap-3">
                  <Bone className="h-6 w-40" />
                  <Bone className="h-6 w-20 rounded-full" />
                </div>
                <Bone className="h-3 w-52" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {Array.from({ length: 5 }, (_, j) => (
                  <div key={j} className="rounded-xl border-2 border-navy/15 px-3 py-2.5">
                    <Bone className="h-2.5 w-16" />
                    <Bone className="h-5 w-20 mt-1.5" />
                  </div>
                ))}
              </div>
            </SkeletonCard>
          ))}
        </div>
      </SkeletonRoot>
      <CargandoOverlay />
    </>
  );
}
