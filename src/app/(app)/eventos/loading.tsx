import { Bone, SkeletonCard, SkeletonHeader, SkeletonRoot } from "@/components/ui/skeleton";
import { CargandoOverlay } from "@/components/ui/cargando-overlay";

export default function Loading() {
  return (
    <>
      <SkeletonRoot>
        <SkeletonHeader subtitle action actionWidth="w-40" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonCard key={i}>
              <Bone className="h-5 w-40" />
              <Bone className="h-3 w-32 mt-2" />
              <div className="grid grid-cols-2 gap-3 mt-4">
                {Array.from({ length: 2 }, (_, j) => (
                  <div key={j}>
                    <Bone className="h-2.5 w-12" />
                    <Bone className="h-4 w-20 mt-1.5" />
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t-2 border-navy/10">
                <Bone className="h-2.5 w-10" />
                <Bone className="h-6 w-24 mt-1.5" />
              </div>
            </SkeletonCard>
          ))}
        </div>
      </SkeletonRoot>
      <CargandoOverlay />
    </>
  );
}
