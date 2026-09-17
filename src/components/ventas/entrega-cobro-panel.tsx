"use client";

import { useState, useTransition } from "react";
import { registrarEntrega, registrarCobro } from "@/app/(app)/ventas/actions";
import { formatMoney } from "@/lib/format";

export function EntregaCobroPanel({
  ventaId,
  cantidad,
  cantidadEntregada,
  precioTotal,
  montoCobrado,
}: {
  ventaId: string;
  cantidad: number;
  cantidadEntregada: number;
  precioTotal: number;
  montoCobrado: number;
}) {
  const restanteEntrega = cantidad - cantidadEntregada;
  const restanteCobro = precioTotal - montoCobrado;

  const [cantidadInput, setCantidadInput] = useState(String(restanteEntrega));
  const [montoInput, setMontoInput] = useState(String(restanteCobro));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleEntrega(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await registrarEntrega(ventaId, Number(cantidadInput));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al registrar la entrega.");
      }
    });
  }

  function handleCobro(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await registrarCobro(ventaId, Number(montoInput));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al registrar el cobro.");
      }
    });
  }

  if (restanteEntrega <= 0 && restanteCobro <= 0) return null;

  return (
    <div className="card-chunky p-5 flex flex-col gap-5">
      <h2 className="font-extrabold text-sm uppercase tracking-wide text-navy/60">Pendientes</h2>

      {error && <p className="text-sm font-bold text-rosa">{error}</p>}

      {restanteEntrega > 0 && (
        <form onSubmit={handleEntrega} className="flex items-end gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold mb-1.5">
              Entrega pendiente: <span className="font-black">{restanteEntrega} un.</span>
            </p>
            <input
              type="number"
              min="1"
              max={restanteEntrega}
              className="input-chunky w-32"
              value={cantidadInput}
              onChange={(e) => setCantidadInput(e.target.value)}
            />
          </div>
          <button type="submit" disabled={pending} className="btn-secondary text-sm">
            Registrar entrega
          </button>
        </form>
      )}

      {restanteCobro > 0 && (
        <form onSubmit={handleCobro} className="flex items-end gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold mb-1.5">
              Cobro pendiente: <span className="font-black">{formatMoney(restanteCobro)}</span>
            </p>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={restanteCobro}
              className="input-chunky w-40"
              value={montoInput}
              onChange={(e) => setMontoInput(e.target.value)}
            />
          </div>
          <button type="submit" disabled={pending} className="btn-secondary text-sm">
            Registrar cobro
          </button>
        </form>
      )}
    </div>
  );
}
