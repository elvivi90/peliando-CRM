import Image from "next/image";

// Capa de carga que va SOBRE el skeleton de cada pantalla: un backdrop apenas
// oscuro y el logo animado (sin fondo) flotando en el centro. La animacion sale
// del GIF del logo (scripts/generate-splash.py).
export function CargandoOverlay() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="loading-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <Image
        src="/splash/logo-cargando.webp"
        alt=""
        width={512}
        height={512}
        unoptimized
        className="h-auto w-[min(72vw,340px)]"
      />
      <span className="sr-only">Cargando...</span>
    </div>
  );
}
