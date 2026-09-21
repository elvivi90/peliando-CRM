import { Bone, SkeletonCampo, SkeletonHeader, SkeletonRoot } from "@/components/ui/skeleton";
import { CargandoOverlay } from "@/components/ui/cargando-overlay";

export default function Loading() {
  return (
    <>
      <SkeletonRoot>
        <SkeletonHeader />
        <div className="card-chunky p-6 flex flex-col gap-5 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SkeletonCampo />
            <SkeletonCampo />
          </div>
          <div>
            <Bone className="h-3 w-28 mb-3" />
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="flex gap-3">
                  <Bone className="h-11 flex-1 rounded-xl" />
                  <Bone className="h-11 flex-1 rounded-xl" />
                  <Bone className="h-11 w-11 rounded-xl" />
                </div>
              ))}
            </div>
            <Bone className="h-9 w-32 rounded-xl mt-3" />
          </div>
          <Bone className="h-11 w-36 rounded-xl" />
        </div>
      </SkeletonRoot>
      <CargandoOverlay />
    </>
  );
}
