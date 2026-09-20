"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { crearClienteRapido } from "@/app/(app)/clientes/actions";

export type ClienteCreado = { id: string; nombre: string; apellido: string; tipo: string };

export function ModalClienteRapido({
  onCreado,
  onClose,
}: {
  onCreado: (cliente: ClienteCreado) => void;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<"MAYORISTA" | "DISTRIBUIDOR">("MAYORISTA");
  const [precio, setPrecio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const cliente = await crearClienteRapido({
          nombreCompleto: nombre,
          tipo,
          precioParticular: tipo === "MAYORISTA" ? precio : undefined,
        });
        onCreado(cliente);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo crear el cliente.");
      }
    });
  }

  return (
    <Modal titulo="Nuevo cliente rápido" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-extrabold uppercase tracking-wide text-navy/70">
            Nombre y apellido <span className="text-rosa">*</span>
          </span>
          <input
            autoFocus
            required
            className="input-chunky"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-extrabold uppercase tracking-wide text-navy/70">Tipo</span>
          <div role="radiogroup" aria-label="Tipo de cliente" className="flex gap-2">
            {(["MAYORISTA", "DISTRIBUIDOR"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={tipo === t}
                onClick={() => setTipo(t)}
                className={`rounded-xl border-2 border-navy px-3.5 py-2 text-sm font-black ${
                  tipo === t ? "bg-amarillo" : "bg-tarjeta font-bold"
                }`}
              >
                {t === "MAYORISTA" ? "Mayorista" : "Distribuidor"}
              </button>
            ))}
          </div>
        </div>

        {tipo === "MAYORISTA" ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-extrabold uppercase tracking-wide text-navy/70">
              Precio particular (opcional)
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="—"
              className="input-chunky w-32"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
            />
          </label>
        ) : (
          <p className="text-xs font-semibold text-navy/60">
            El distribuidor siempre paga el precio del tramo menos 20%.
          </p>
        )}

        {error && (
          <p className="text-sm font-bold text-rosa" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? "Creando..." : "Crear y volver a la venta →"}
        </button>
        <button type="button" onClick={onClose} className="text-sm font-bold text-navy/60 underline">
          Cancelar
        </button>
      </form>
    </Modal>
  );
}
