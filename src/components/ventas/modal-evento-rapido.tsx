"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { crearEventoRapido } from "@/app/(app)/eventos/actions";
import { todayInputValue } from "@/lib/date";

export type EventoCreado = { id: string; nombre: string };

export function ModalEventoRapido({
  fechaInicial,
  onCreado,
  onClose,
}: {
  fechaInicial?: string;
  onCreado: (evento: EventoCreado) => void;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState(() => fechaInicial || todayInputValue());
  const [lugar, setLugar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const evento = await crearEventoRapido({ nombre, fecha, lugar });
        onCreado(evento);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo crear el evento.");
      }
    });
  }

  return (
    <Modal titulo="Nuevo evento rápido" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            Fecha <span className="text-rosa">*</span>
          </span>
          <input
            type="date"
            required
            className="input-chunky w-44"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-extrabold uppercase tracking-wide text-navy/70">
            Lugar (opcional)
          </span>
          <input
            placeholder="—"
            className="input-chunky"
            value={lugar}
            onChange={(e) => setLugar(e.target.value)}
          />
        </label>

        {error && (
          <p className="text-sm font-bold text-rosa" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn-primary w-full bg-rosa text-white">
          {pending ? "Creando..." : "Crear y volver a la venta →"}
        </button>
        <button type="button" onClick={onClose} className="text-sm font-bold text-navy/60 underline">
          Cancelar
        </button>
      </form>
    </Modal>
  );
}
