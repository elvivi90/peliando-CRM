"use client";

import { useEffect, useId } from "react";

// Modal simple: no toca el estado de quien lo renderiza, asi que la pantalla
// de atras (por ej. la venta en curso) queda exactamente como estaba.
export function Modal({
  titulo,
  onClose,
  children,
}: {
  titulo: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const tituloId = useId();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className="w-full max-w-sm rounded-[20px] border-[3px] border-navy bg-modal p-6"
      >
        <h2 id={tituloId} className="text-xl font-black mb-4">
          {titulo}
        </h2>
        {children}
      </div>
    </div>
  );
}
