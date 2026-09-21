import Image from "next/image";

// Indicador de carga de todas las pantallas de la app: la animacion del logo
// (recortada y comprimida desde el GIF original, que pesaba 31 MB).
export default function Loading() {
  return (
    <div className="flex items-center justify-center py-24" role="status" aria-live="polite">
      <div className="size-36 overflow-hidden rounded-3xl border-[3px] border-navy bg-splash">
        <Image
          src="/splash/cargando.webp"
          alt=""
          width={360}
          height={360}
          unoptimized
          className="size-full"
        />
      </div>
      <span className="sr-only">Cargando...</span>
    </div>
  );
}
