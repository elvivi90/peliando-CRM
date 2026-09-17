"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { crearProducto } from "@/app/(app)/productos/actions";

export default function NuevoProductoPage() {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [stockActual, setStockActual] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await crearProducto({ nombre, descripcion, stockActual });
      } catch (err) {
        const digest = (err as { digest?: string })?.digest;
        if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw err;
        setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
      }
    });
  }

  return (
    <div>
      <PageHeader title="Nuevo producto" />
      <form onSubmit={handleSubmit} className="card-chunky p-6 flex flex-col gap-4 max-w-lg">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-extrabold uppercase tracking-wide text-navy/70">
            Nombre *
          </span>
          <input
            className="input-chunky"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-extrabold uppercase tracking-wide text-navy/70">
            Descripción
          </span>
          <input
            className="input-chunky"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-extrabold uppercase tracking-wide text-navy/70">
            Stock inicial
          </span>
          <input
            type="number"
            min="0"
            className="input-chunky"
            value={stockActual}
            onChange={(e) => setStockActual(e.target.value)}
          />
        </label>
        {error && <p className="text-sm font-bold text-rosa">{error}</p>}
        <button type="submit" disabled={pending} className="btn-primary self-start">
          {pending ? "Guardando..." : "Crear producto"}
        </button>
      </form>
    </div>
  );
}
