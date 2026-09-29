"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import L, { type LatLngBoundsExpression } from "leaflet";
import { formatMoney } from "@/lib/format";
import type { Canal, PuntoMapa } from "@/lib/services/mapa";

const CANALES: Canal[] = ["Tiendup", "Eventos", "Mayoristas", "Minoristas"];

// Argentina entera, para cuando no hay puntos.
const ARGENTINA: LatLngBoundsExpression = [
  [-55, -73.5],
  [-21.8, -53.6],
];

// El area del circulo crece con las unidades (radio ~ raiz), con un minimo
// visible y un tope para que una localidad grande no tape el resto.
function radio(unidades: number) {
  return Math.min(6 + 4 * Math.sqrt(unidades), 40);
}

// Zoom con Ctrl + rueda (o pellizcando el touchpad, que el navegador manda
// como rueda con Ctrl). La rueda sola sigue scrolleando la pagina, para que
// el mapa no "atrape" el scroll al pasar por encima. preventDefault evita
// que el navegador haga zoom de toda la pagina con Ctrl + rueda.
function ZoomConCtrl() {
  const map = useMap();
  useEffect(() => {
    const contenedor = map.getContainer();
    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const paso = Math.max(-1, Math.min(1, -e.deltaY / 100));
      map.setZoomAround(map.mouseEventToContainerPoint(e), map.getZoom() + paso);
    }
    contenedor.addEventListener("wheel", onWheel, { passive: false });
    return () => contenedor.removeEventListener("wheel", onWheel);
  }, [map]);
  return null;
}

// Solo se carga en el navegador (ver mapa-ventas.tsx): Leaflet usa window.
export default function MapaVentasLeaflet({ puntos }: { puntos: PuntoMapa[] }) {
  const bounds: LatLngBoundsExpression =
    puntos.length > 0 ? puntos.map((p) => [p.lat, p.lng] as [number, number]) : ARGENTINA;

  return (
    <MapContainer
      bounds={bounds}
      boundsOptions={{ padding: [40, 40], maxZoom: 11 }}
      scrollWheelZoom={false}
      // En el celular: un dedo scrollea la pagina y dos dedos hacen zoom y
      // mueven el mapa (touchZoom). En la compu se arrastra con el mouse.
      dragging={!L.Browser.mobile}
      zoomSnap={0.5}
      className="h-full w-full rounded-xl z-0"
    >
      <ZoomConCtrl />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {puntos.map((p) => (
        <CircleMarker
          key={p.etiqueta}
          center={[p.lat, p.lng]}
          radius={radio(p.unidades)}
          pathOptions={{ color: "#142653", weight: 2, fillColor: "#C9579A", fillOpacity: 0.6 }}
        >
          <Popup>
            <div className="text-sm min-w-44">
              <div className="font-black">{p.etiqueta}</div>
              <div className="mt-1">
                {p.ventas} venta{p.ventas === 1 ? "" : "s"} · {p.unidades} u. · {formatMoney(p.monto)}
              </div>
              <ul className="mt-1.5">
                {CANALES.filter((c) => p.porCanal[c]).map((c) => (
                  <li key={c} className="flex justify-between gap-3 text-xs">
                    <span>{c}</span>
                    <span className="font-bold">{p.porCanal[c]!.unidades} u.</span>
                  </li>
                ))}
              </ul>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
