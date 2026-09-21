import { Bone, SkeletonHeader, SkeletonRoot } from "@/components/ui/skeleton";
import { CargandoOverlay } from "@/components/ui/cargando-overlay";

export default function Loading() {
  return (
    <>
      <SkeletonRoot>
        <SkeletonHeader />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="card-chunky flex items-center gap-3.5 px-5 py-4">
              <Bone className="w-9 h-9 flex-none" />
              <Bone className="h-4 w-36" />
            </div>
          ))}
        </div>
      </SkeletonRoot>
      <CargandoOverlay />
    </>
  );
}
