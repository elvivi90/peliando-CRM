import { Bone, SkeletonCard, SkeletonHeader, SkeletonRoot } from "@/components/ui/skeleton";
import { CargandoOverlay } from "@/components/ui/cargando-overlay";

export default function Loading() {
  return (
    <>
      <SkeletonRoot>
        <SkeletonHeader action actionWidth="w-40" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }, (_, i) => (
            <SkeletonCard key={i}>
              <Bone className="h-5 w-36" />
              <Bone className="h-4 w-48 mt-2" />
              <div className="mt-4">
                <Bone className="h-3 w-24" />
                <Bone className="h-9 w-32 mt-2 rounded-xl" />
              </div>
            </SkeletonCard>
          ))}
        </div>
      </SkeletonRoot>
      <CargandoOverlay />
    </>
  );
}
