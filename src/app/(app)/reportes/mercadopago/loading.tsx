import { SkeletonHeader, SkeletonRoot, SkeletonStatCards } from "@/components/ui/skeleton";
import { CargandoOverlay } from "@/components/ui/cargando-overlay";

export default function Loading() {
  return (
    <>
      <SkeletonRoot>
        <SkeletonHeader subtitle />
        <SkeletonStatCards count={3} />
      </SkeletonRoot>
      <CargandoOverlay />
    </>
  );
}
