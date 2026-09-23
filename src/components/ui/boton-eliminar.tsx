"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";

// Boton + modal de confirmacion, reusado en clientes/eventos/ventas/gastos.
// `onEliminar` es la server action ya bindeada con el id (ej.
// `eliminarCliente.bind(null, cliente.id)`). Si la accion termina en
// redirect(), el NEXT_REDIRECT especial se deja pasar sin tratarlo como error
// (mismo patron que venta-form.tsx y las demas altas de este CRM).
export function BotonEliminar({
  entidad,
  onEliminar,
  compacto = false,
}: {
  entidad: string;
  onEliminar: () => Promise<void>;
  compacto?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmar() {
    setError(null);
    startTransition(async () => {
      try {
        await onEliminar();
        setAbierto(false);
      } catch (err) {
        const digest = (err as { digest?: string })?.digest;
        if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw err;
        setError(err instanceof Error ? err.message : "No se pudo eliminar.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className={
          compacto
            ? "text-xs font-bold text-rosa hover:underline"
            : "btn-secondary text-sm !border-rosa !text-rosa"
        }
      >
        Eliminar
      </button>
      {abierto && (
        <Modal titulo={`¿Eliminar ${entidad}?`} onClose={() => setAbierto(false)}>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-navy/70">Esta acción no se puede deshacer.</p>
            {error && (
              <p className="text-sm font-bold text-rosa" role="alert">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={confirmar}
              disabled={pending}
              className="btn-primary w-full bg-rosa text-white"
            >
              {pending ? "Eliminando..." : "Sí, eliminar"}
            </button>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="text-sm font-bold text-navy/60 underline"
            >
              Cancelar
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
