"use client";

import dynamic from "next/dynamic";
import type { PuntoMapa } from "@/lib/services/mapa";

// Leaflet necesita window: el mapa se carga solo en el navegador.
const MapaVentasLeaflet = dynamic(() => import("@/components/reportes/mapa-ventas-leaflet"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full rounded-xl bg-navy/5 grid place-items-center text-sm text-navy/50">
      Cargando mapa...
    </div>
  ),
});

export function MapaVentas({ puntos }: { puntos: PuntoMapa[] }) {
  return <MapaVentasLeaflet puntos={puntos} />;
}
