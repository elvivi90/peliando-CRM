"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { crearEvento } from "@/app/(app)/eventos/actions";
import { todayInputValue } from "@/lib/date";

export default function NuevoEventoPage() {
  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState(() => todayInputValue());
  const [lugar, setLugar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await crearEvento({ nombre, fecha, lugar });
      } catch (err) {
        const digest = (err as { digest?: string })?.digest;
        if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw err;
        setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
      }
    });
  }

  return (
    <div>
      <PageHeader title="Nuevo evento" />
      <form onSubmit={handleSubmit} className="card-chunky p-6 flex flex-col gap-4 max-w-lg">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-extrabold uppercase tracking-wide text-navy/70">
            Nombre *
          </span>
          <input
            className="input-chunky"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Feria de Palermo"
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
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-extrabold uppercase tracking-wide text-navy/70">
            Lugar
          </span>
          <input
            className="input-chunky"
            value={lugar}
            onChange={(e) => setLugar(e.target.value)}
          />
        </label>
        {error && <p className="text-sm font-bold text-rosa">{error}</p>}
        <button type="submit" disabled={pending} className="btn-primary self-start">
          {pending ? "Guardando..." : "Crear evento"}
        </button>
      </form>
    </div>
  );
}
