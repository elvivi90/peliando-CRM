"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { crearClienteRapido } from "@/app/(app)/clientes/actions";

export type ClienteCreado = {
  id: string;
  nombreNegocio: string | null;
  nombre: string;
  apellido: string;
  tipo: string;
};

export function ModalClienteRapido({
  onCreado,
  onClose,
}: {
  onCreado: (cliente: ClienteCreado) => void;
  onClose: () => void;
}) {
  const [negocio, setNegocio] = useState("");
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<"MAYORISTA" | "DISTRIBUIDOR">("MAYORISTA");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const cliente = await crearClienteRapido({
          nombreNegocio: negocio,
          nombreCompleto: nombre,
          tipo,
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
            Nombre del negocio <span className="text-rosa">*</span>
          </span>
          <input
            autoFocus
            required
            className="input-chunky"
            value={negocio}
            onChange={(e) => setNegocio(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-extrabold uppercase tracking-wide text-navy/70">
            Contacto: nombre y apellido (opcional)
          </span>
          <input
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

        <p className="text-xs font-semibold text-navy/60">
          {tipo === "MAYORISTA"
            ? "El mayorista paga el precio del tramo de la lista activa."
            : "El distribuidor paga el precio del tramo de la lista activa menos 20%."}
        </p>

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
