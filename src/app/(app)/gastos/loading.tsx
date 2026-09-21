import { SkeletonHeader, SkeletonRoot, SkeletonTable } from "@/components/ui/skeleton";
import { CargandoOverlay } from "@/components/ui/cargando-overlay";

export default function Loading() {
  return (
    <>
      <SkeletonRoot>
        <SkeletonHeader subtitle action actionWidth="w-36" />
        <SkeletonTable
          filas={8}
          columnas={[
            { ancho: "w-20" },
            { ancho: "w-40" },
            { ancho: "w-24" },
            { ancho: "w-28" },
            { ancho: "w-20" },
          ]}
        />
      </SkeletonRoot>
      <CargandoOverlay />
    </>
  );
}
