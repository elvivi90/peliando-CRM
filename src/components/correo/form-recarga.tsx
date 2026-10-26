"use client";

import { useState, useTransition } from "react";
import { registrarRecarga } from "@/app/(app)/correo/actions";
import { todayInputValue } from "@/lib/date";

export function FormRecarga() {
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(() => todayInputValue());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await registrarRecarga({ monto, fecha });
        setMonto("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo registrar la recarga.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card-chunky p-5 flex flex-col gap-3">
      <h2 className="font-extrabold text-sm uppercase tracking-wide text-navy/60">
        Registrar recarga
      </h2>
      <p className="text-xs text-navy/60">
        Cada vez que se carga saldo en el portal de Correo Argentino, anotalo acá.
      </p>
      <div className="flex items-end gap-3 flex-wrap">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wide text-navy/60">Monto</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            className="input-chunky w-40"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wide text-navy/60">Fecha</span>
          <input
            type="date"
            className="input-chunky w-44"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={pending || !monto} className="btn-primary text-sm">
          {pending ? "Guardando..." : "+ Recarga"}
        </button>
      </div>
      {error && <p className="text-sm font-bold text-rosa">{error}</p>}
    </form>
  );
}
