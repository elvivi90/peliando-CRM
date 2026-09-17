"use client";

import { useState, useTransition } from "react";
import { crearEntregaConcesion } from "@/app/(app)/concesion/actions";

type Cliente = { id: string; nombre: string; apellido: string };
type Producto = { id: string; nombre: string; stockActual: number };

export function NuevaEntregaForm({
  clientesConcesion,
  productos,
}: {
  clientesConcesion: Cliente[];
  productos: Producto[];
}) {
  const [clienteId, setClienteId] = useState("");
  const [productoId, setProductoId] = useState(productos[0]?.id ?? "");
  const [cantidad, setCantidad] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
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
        setClienteId("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
      }
    });
  }

  if (clientesConcesion.length === 0) {
    return (
      <p className="text-sm text-navy/60">
        No hay clientes de tipo Concesión todavía. Creá uno desde la sección Clientes.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-chunky p-5 flex flex-col gap-4">
      <h2 className="font-extrabold text-sm uppercase tracking-wide text-navy/60">
        Nueva entrega en concesión
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select
          className="input-chunky"
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
          required
        >
          <option value="">Elegir cliente...</option>
          {clientesConcesion.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} {c.apellido}
            </option>
          ))}
        </select>
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
      </div>
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
      <button type="submit" disabled={pending} className="btn-primary self-start text-sm">
        {pending ? "Guardando..." : "Registrar entrega"}
      </button>
    </form>
  );
}
