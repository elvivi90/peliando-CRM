"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { crearClienteMinoristaRapido } from "@/app/(app)/clientes/actions";
import type { ClienteCreado } from "@/components/ventas/modal-cliente-rapido";

// Comprador de una venta rapida (minorista). Solo nombre y apellido: el resto
// de los datos se completa despues desde Clientes si hace falta.
export function ModalClienteMinorista({
  onCreado,
  onClose,
}: {
  onCreado: (cliente: ClienteCreado) => void;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        onCreado(await crearClienteMinoristaRapido({ nombre, apellido }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo crear el cliente.");
      }
    });
  }

  return (
    <Modal titulo="Nuevo cliente minorista" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-extrabold uppercase tracking-wide text-navy/70">
              Nombre <span className="text-rosa">*</span>
            </span>
            <input
              autoFocus
              required
              className="input-chunky"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-extrabold uppercase tracking-wide text-navy/70">
              Apellido
            </span>
            <input
              className="input-chunky"
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
            />
          </label>
        </div>

        {error && (
          <p className="text-sm font-bold text-rosa" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? "Creando..." : "Crear y volver a la venta →"}
        </button>
        <button type="button" onClick={onClose} className="text-sm font-bold text-navy/60 underline">
          Cancelar
        </button>
      </form>
    </Modal>
  );
}
