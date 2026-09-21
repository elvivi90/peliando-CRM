import { Bone, SkeletonCard, SkeletonRoot, SkeletonStatCards } from "@/components/ui/skeleton";
import { CargandoOverlay } from "@/components/ui/cargando-overlay";

export default function Loading() {
  return (
    <>
      <SkeletonRoot className="flex flex-col gap-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Bone className="h-8 w-40" />
          <div className="flex gap-2">
            <Bone className="h-10 w-32 rounded-xl" />
            <Bone className="h-10 w-24 rounded-xl" />
            <Bone className="h-10 w-16 rounded-xl" />
          </div>
        </div>

        <SkeletonStatCards hint={false} />

        <SkeletonCard className="lg:p-6">
          <Bone className="h-3 w-52 mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="rounded-xl border-2 border-navy/15 px-4 py-3">
                <Bone className="h-2.5 w-16" />
                <Bone className="h-6 w-24 mt-1.5" />
              </div>
            ))}
          </div>
        </SkeletonCard>

        <SkeletonCard className="lg:p-6">
          <Bone className="h-3 w-56 mb-4" />
          <Bone className="h-64 rounded-xl" />
        </SkeletonCard>

        <SkeletonCard className="lg:p-6">
          <Bone className="h-3 w-44 mb-4" />
          <Bone className="h-72 rounded-xl" />
        </SkeletonCard>

        <Bone className="h-4 w-40" />
      </SkeletonRoot>
      <CargandoOverlay />
    </>
  );
}
