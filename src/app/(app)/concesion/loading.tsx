import { Bone, SkeletonCard, SkeletonHeader, SkeletonRoot } from "@/components/ui/skeleton";
import { CargandoOverlay } from "@/components/ui/cargando-overlay";

export default function Loading() {
  return (
    <>
      <SkeletonRoot className="flex flex-col gap-6">
        <SkeletonHeader subtitle />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonCard key={i} className="flex flex-col gap-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <Bone className="h-5 w-36" />
                  <Bone className="h-3 w-28 mt-2" />
                </div>
                <div className="flex flex-col items-end">
                  <Bone className="h-2.5 w-24" />
                  <Bone className="h-7 w-10 mt-1.5" />
                </div>
              </div>
              <div className="flex gap-2">
                <Bone className="h-9 w-24 rounded-xl" />
                <Bone className="h-9 w-24 rounded-xl" />
              </div>
            </SkeletonCard>
          ))}
        </div>
      </SkeletonRoot>
      <CargandoOverlay />
    </>
  );
}
