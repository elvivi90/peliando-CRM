import { SkeletonFormulario, SkeletonHeader, SkeletonRoot } from "@/components/ui/skeleton";
import { CargandoOverlay } from "@/components/ui/cargando-overlay";

export default function Loading() {
  return (
    <>
      <SkeletonRoot>
        <SkeletonHeader />
        <SkeletonFormulario filas={[1, 1, 2, 1]} />
      </SkeletonRoot>
      <CargandoOverlay />
    </>
  );
}
