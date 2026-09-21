import { Bone, SkeletonCard, SkeletonHeader, SkeletonRoot } from "@/components/ui/skeleton";
import { CargandoOverlay } from "@/components/ui/cargando-overlay";

export default function Loading() {
  return (
    <>
      <SkeletonRoot>
        <SkeletonHeader subtitle />
        <SkeletonCard className="flex flex-col gap-3">
          <Bone className="h-4 w-40" />
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-3/4" />
          <Bone className="h-32 rounded-xl" />
        </SkeletonCard>
      </SkeletonRoot>
      <CargandoOverlay />
    </>
  );
}
