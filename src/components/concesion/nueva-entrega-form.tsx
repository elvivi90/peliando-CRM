"use client";

import { useState, useTransition } from "react";
import { crearEntregaConcesion } from "@/app/(app)/concesion/actions";
import { todayInputValue } from "@/lib/date";

type Producto = { id: string; nombre: string; stockActual: number };

// Se usa desde la ficha de un cliente mayorista: el cliente ya viene fijado.
export function NuevaEntregaForm({
  clienteId,
  productos,
}: {
  clienteId: string;
  productos: Producto[];
}) {
  const [abierto, setAbierto] = useState(false);
  const [productoId, setProductoId] = useState(productos[0]?.id ?? "");
  const [cantidad, setCantidad] = useState("");
  const [fecha, setFecha] = useState(() => todayInputValue());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await crearEntregaConcesion({
          clienteId,
          productoId,
          cantidadEntregada: cantidad,
          fecha,
        });
        setCantidad("");
        setAbierto(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
      }
    });
  }

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="btn-secondary text-sm mt-4">
        Nueva entrega en concesión
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 w-full flex flex-col gap-3 border-t-2 border-navy/10 pt-4">
      <select
        className="input-chunky"
        value={productoId}
        onChange={(e) => setProductoId(e.target.value)}
        required
      >
        {productos.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre} (stock: {p.stockActual})
          </option>
        ))}
      </select>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="number"
          min="1"
          placeholder="Cantidad"
          className="input-chunky"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          required
        />
        <input
          type="date"
          className="input-chunky"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          required
        />
      </div>
      {error && <p className="text-sm font-bold text-rosa">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-primary text-sm">
          {pending ? "Guardando..." : "Registrar entrega"}
        </button>
        <button
          type="button"
          onClick={() => {
            setAbierto(false);
            setError(null);
          }}
          className="btn-secondary text-sm"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
