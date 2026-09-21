"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const VISIBLE_MS = 1600;
const FADE_MS = 400;

type Fase = "visible" | "saliendo" | "oculto";

// Pantalla inicial de la app (celular / PWA instalada): logo sobre el rosa de
// la marca. Se muestra al abrir la app; en recargas dentro de la misma sesion
// solo cubre la pantalla lo que tarda en hidratar. En escritorio no se ve
// (ver #splash-inicial en globals.css).
export function SplashInicial() {
  const [fase, setFase] = useState<Fase>("visible");

  useEffect(() => {
    let yaVisto = false;
    try {
      yaVisto = sessionStorage.getItem("splash-visto") === "1";
      sessionStorage.setItem("splash-visto", "1");
    } catch {
      // sin sessionStorage (modo privado, etc.): se muestra siempre
    }

    const espera = yaVisto ? 0 : VISIBLE_MS;
    const salir = setTimeout(() => setFase("saliendo"), espera);
    const ocultar = setTimeout(() => setFase("oculto"), espera + FADE_MS);
    return () => {
      clearTimeout(salir);
      clearTimeout(ocultar);
    };
  }, []);

  if (fase === "oculto") return null;

  return (
    <div
      id="splash-inicial"
      aria-hidden
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-splash transition-opacity duration-[400ms] ${
        fase === "saliendo" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <Image
        src="/splash/logo-splash.png"
        alt=""
        width={720}
        height={720}
        loading="eager"
        unoptimized
        className="h-auto w-[min(78vw,340px)]"
      />
    </div>
  );
}
