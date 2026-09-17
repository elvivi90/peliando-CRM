"use client";

import { useState, useTransition } from "react";
import { crearGasto } from "@/app/(app)/gastos/actions";

const CATEGORIAS = [
  { value: "TRANSPORTE", label: "Transporte" },
  { value: "COMIDA", label: "Comida" },
  { value: "MARKETING_PRODUCCION", label: "Marketing / Producción" },
  { value: "OTROS", label: "Otros" },
] as const;

export function GastoForm({ eventos }: { eventos: { id: string; nombre: string }[] }) {
  const [categoria, setCategoria] = useState<string>("TRANSPORTE");
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [eventoId, setEventoId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await crearGasto({ categoria, concepto, monto, fecha, eventoId });
      } catch (err) {
        const digest = (err as { digest?: string })?.digest;
        if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw err;
        setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card-chunky p-6 flex flex-col gap-4 max-w-lg">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-extrabold uppercase tracking-wide text-navy/70">
          Categoría *
        </span>
        <select className="input-chunky" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          {CATEGORIAS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-extrabold uppercase tracking-wide text-navy/70">
          Concepto *
        </span>
        <input
          className="input-chunky"
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
          placeholder="Nafta ida y vuelta feria"
          required
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-extrabold uppercase tracking-wide text-navy/70">
            Monto *
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input-chunky"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-extrabold uppercase tracking-wide text-navy/70">
            Fecha *
          </span>
          <input
            type="date"
            className="input-chunky"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-extrabold uppercase tracking-wide text-navy/70">
          Evento (opcional)
        </span>
        <select className="input-chunky" value={eventoId} onChange={(e) => setEventoId(e.target.value)}>
          <option value="">Sin evento</option>
          {eventos.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.nombre}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="text-sm font-bold text-rosa">{error}</p>}

      <button type="submit" disabled={pending} className="btn-primary self-start">
        {pending ? "Guardando..." : "Registrar gasto"}
      </button>
    </form>
  );
}
