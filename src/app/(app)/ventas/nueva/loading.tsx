import { Bone, SkeletonHeader, SkeletonRoot } from "@/components/ui/skeleton";
import { CargandoOverlay } from "@/components/ui/cargando-overlay";

export default function Loading() {
  return (
    <>
      <SkeletonRoot>
        <SkeletonHeader />
        <div className="card-chunky p-6 flex flex-col gap-5 max-w-md mx-auto">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="w-4 h-0.5 bg-navy/25" />}
                <Bone className="size-7 rounded-full" />
              </div>
            ))}
          </div>
          <div>
            <Bone className="h-6 w-52" />
            <Bone className="h-4 w-40 mt-2" />
          </div>
          <div className="flex flex-col gap-2.5">
            <Bone className="h-14 rounded-xl" />
            <Bone className="h-14 rounded-xl" />
          </div>
          <Bone className="h-11 w-32 rounded-xl" />
        </div>
      </SkeletonRoot>
      <CargandoOverlay />
    </>
  );
}
