import { Bone, SkeletonCard, SkeletonHeader, SkeletonRoot } from "@/components/ui/skeleton";
import { CargandoOverlay } from "@/components/ui/cargando-overlay";

export default function Loading() {
  return (
    <>
      <SkeletonRoot className="flex flex-col gap-6 max-w-2xl">
        <SkeletonHeader subtitle action actionWidth="w-24" />

        <SkeletonCard className="grid grid-cols-2 gap-4">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i}>
              <Bone className="h-3 w-16" />
              <Bone className="h-4 w-28 mt-1.5" />
            </div>
          ))}
        </SkeletonCard>

        <SkeletonCard className="flex flex-col gap-5">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="flex flex-col gap-2.5">
              <Bone className="h-3 w-36" />
              <div className="flex gap-2.5">
                <Bone className="h-11 w-32 rounded-xl" />
                <Bone className="h-11 w-28 rounded-xl" />
              </div>
            </div>
          ))}
        </SkeletonCard>

        <SkeletonCard>
          <Bone className="h-3 w-40 mb-3" />
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="flex justify-between border-t border-navy/10 pt-2 mt-2 first:border-0 first:pt-0 first:mt-0">
              <Bone className="h-4 w-20" />
              <Bone className="h-4 w-14" />
            </div>
          ))}
        </SkeletonCard>
      </SkeletonRoot>
      <CargandoOverlay />
    </>
  );
}
