"use client";

import { useState, useTransition } from "react";
import { crearListaPrecios } from "@/app/(app)/precios/actions";

type Tramo = { cantidadDesde: string; precioUnitario: string };

export function ListaPreciosForm({ hayListaActiva }: { hayListaActiva: boolean }) {
  const [nombre, setNombre] = useState("");
  const [pvp, setPvp] = useState("");
  const [tramos, setTramos] = useState<Tramo[]>([
    { cantidadDesde: "10", precioUnitario: "" },
    { cantidadDesde: "20", precioUnitario: "" },
    { cantidadDesde: "40", precioUnitario: "" },
    { cantidadDesde: "100", precioUnitario: "" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateTramo(i: number, key: keyof Tramo, value: string) {
    setTramos((ts) => ts.map((t, idx) => (idx === i ? { ...t, [key]: value } : t)));
  }

  function addTramo() {
    setTramos((ts) => [...ts, { cantidadDesde: "", precioUnitario: "" }]);
  }

  function removeTramo(i: number) {
    setTramos((ts) => ts.filter((_, idx) => idx !== i));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await crearListaPrecios({
          nombre,
          pvp: Number(pvp),
          tramos: tramos.map((t) => ({
            cantidadDesde: Number(t.cantidadDesde),
            precioUnitario: Number(t.precioUnitario),
          })),
        });
      } catch (err) {
        const digest = (err as { digest?: string })?.digest;
        if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw err;
        setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card-chunky p-6 flex flex-col gap-5 max-w-2xl">
      {hayListaActiva && (
        <p className="text-sm bg-amarillo/25 border-2 border-navy rounded-xl px-4 py-3 font-semibold">
          Al guardar, la lista activa actual pasará a histórica automáticamente.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-extrabold uppercase tracking-wide text-navy/70">
            Nombre de la lista
          </span>
          <input
            className="input-chunky"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Lista 2026"
            required
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-extrabold uppercase tracking-wide text-navy/70">
            PVP (precio minorista)
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input-chunky"
            value={pvp}
            onChange={(e) => setPvp(e.target.value)}
            placeholder="40000"
            required
          />
        </label>
      </div>

      <div>
        <span className="text-xs font-extrabold uppercase tracking-wide text-navy/70">
          Tramos de precio mayorista
        </span>
        <div className="flex flex-col gap-2 mt-2">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-extrabold uppercase text-navy/50 px-1">
            <span>Cantidad desde</span>
            <span>Precio c/u</span>
            <span></span>
          </div>
          {tramos.map((t, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
              <input
                type="number"
                min="1"
                className="input-chunky"
                value={t.cantidadDesde}
                onChange={(e) => updateTramo(i, "cantidadDesde", e.target.value)}
                required
              />
              <input
                type="number"
                step="0.01"
                min="0"
                className="input-chunky"
                value={t.precioUnitario}
                onChange={(e) => updateTramo(i, "precioUnitario", e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => removeTramo(i)}
                className="w-9 h-9 rounded-lg border-2 border-navy/30 text-navy/50 hover:border-rosa hover:text-rosa flex items-center justify-center"
                aria-label="Quitar tramo"
                disabled={tramos.length <= 1}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addTramo} className="btn-secondary text-xs mt-3">
          + Agregar tramo
        </button>
      </div>

      {error && (
        <p className="text-sm font-bold text-rosa" role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary self-start">
        {pending ? "Guardando..." : "Crear lista y activarla"}
      </button>
    </form>
  );
}
