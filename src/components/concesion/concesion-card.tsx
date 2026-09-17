"use client";

import { useState, useTransition } from "react";
import { crearLiquidacion, crearDevolucion } from "@/app/(app)/concesion/actions";
import { formatDate, formatMoney } from "@/lib/format";

type Concesion = {
  id: string;
  fechaEntrega: Date | string;
  cantidadEntregada: number;
  saldo: number;
  cliente: { nombre: string; apellido: string };
  producto: { nombre: string };
  liquidaciones: {
    id: string;
    cantidadVendida: number;
    montoCobrado: string | number;
    fecha: Date | string;
  }[];
  devoluciones: { id: string; cantidad: number; fecha: Date | string }[];
};

export function ConcesionCard({ concesion }: { concesion: Concesion }) {
  const [modo, setModo] = useState<"none" | "liquidar" | "devolver">("none");
  const [cantidad, setCantidad] = useState("");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setModo("none");
    setCantidad("");
    setMonto("");
    setError(null);
  }

  function handleLiquidar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await crearLiquidacion({
          concesionId: concesion.id,
          cantidadVendida: cantidad,
          montoCobrado: monto,
          fecha,
        });
        reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al liquidar.");
      }
    });
  }

  function handleDevolver(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await crearDevolucion({ concesionId: concesion.id, cantidad, fecha });
        reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al registrar la devolución.");
      }
    });
  }

  return (
    <div className="card-chunky p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-black">
            {concesion.cliente.nombre} {concesion.cliente.apellido}
          </h3>
          <p className="text-xs text-navy/50 font-semibold">
            {concesion.producto.nombre} · Entregado {formatDate(concesion.fechaEntrega)}
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-extrabold uppercase text-navy/50">Saldo en concesión</div>
          <div className="font-black text-xl">{concesion.saldo}</div>
        </div>
      </div>

      {concesion.saldo > 0 && (
        <div className="flex gap-2">
          <button onClick={() => setModo("liquidar")} className="btn-secondary text-xs">
            Liquidar
          </button>
          <button onClick={() => setModo("devolver")} className="btn-secondary text-xs">
            Devolver
          </button>
        </div>
      )}

      {modo === "liquidar" && (
        <form onSubmit={handleLiquidar} className="flex flex-col gap-2 border-t-2 border-navy/10 pt-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min="1"
              max={concesion.saldo}
              placeholder="Cant. vendida"
              className="input-chunky"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              required
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Monto cobrado"
              className="input-chunky"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              required
            />
          </div>
          <input
            type="date"
            className="input-chunky"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
          />
          {error && <p className="text-xs font-bold text-rosa">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="btn-primary text-xs">
              Confirmar liquidación
            </button>
            <button type="button" onClick={reset} className="btn-secondary text-xs">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {modo === "devolver" && (
        <form onSubmit={handleDevolver} className="flex flex-col gap-2 border-t-2 border-navy/10 pt-3">
          <input
            type="number"
            min="1"
            max={concesion.saldo}
            placeholder="Cantidad a devolver"
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
          {error && <p className="text-xs font-bold text-rosa">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="btn-primary text-xs">
              Confirmar devolución
            </button>
            <button type="button" onClick={reset} className="btn-secondary text-xs">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {(concesion.liquidaciones.length > 0 || concesion.devoluciones.length > 0) && (
        <details className="text-xs text-navy/60 mt-1">
          <summary className="cursor-pointer font-bold">Ver historial</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {concesion.liquidaciones.map((l) => (
              <li key={l.id}>
                {formatDate(l.fecha)} · Liquidado {l.cantidadVendida} un. ·{" "}
                {formatMoney(l.montoCobrado)}
              </li>
            ))}
            {concesion.devoluciones.map((d) => (
              <li key={d.id}>
                {formatDate(d.fecha)} · Devuelto {d.cantidad} un.
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
