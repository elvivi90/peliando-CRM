"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// Cuanto dura el splash contando desde que el navegador empezo a cargar la
// pagina (no desde que hidrata), asi no se suma a la espera de la app.
const VISIBLE_MS = 2200;
const FADE_MS = 400;

type Fase = "visible" | "saliendo" | "oculto";

// Pantalla inicial de la app (celular / PWA instalada). Arranca en el mismo
// cuadro que el icono de la PWA (splash nativo de Android), asi ambos se leen
// como una sola secuencia, y despues anima el logo. Se muestra al abrir la
// app; en recargas dentro de la misma sesion solo cubre la pantalla lo que
// tarda en hidratar. En escritorio no se ve (ver #splash-inicial en
// globals.css). Los assets se generan con scripts/generate-splash.py.
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

    const espera = yaVisto ? 0 : Math.max(0, VISIBLE_MS - performance.now());
    const salir = setTimeout(() => setFase("saliendo"), espera);
    const ocultar = setTimeout(() => setFase("oculto"), espera + FADE_MS);
    return () => {
      clearTimeout(salir);
      clearTimeout(ocultar);
    };
  }, []);

  if (fase === "oculto") return null;

  const tamano = "h-auto w-[min(78vw,340px)]";

  return (
    <div
      id="splash-inicial"
      aria-hidden
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-splash transition-opacity duration-[400ms] ${
        fase === "saliendo" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      {/* Con "reducir movimiento" del sistema se muestra el cuadro estatico */}
      <Image
        src="/splash/splash.webp"
        alt=""
        width={480}
        height={480}
        loading="eager"
        unoptimized
        className={`${tamano} motion-reduce:hidden`}
      />
      <Image
        src="/splash/logo-splash.png"
        alt=""
        width={720}
        height={720}
        loading="eager"
        unoptimized
        className={`${tamano} hidden motion-reduce:block`}
      />
    </div>
  );
}
