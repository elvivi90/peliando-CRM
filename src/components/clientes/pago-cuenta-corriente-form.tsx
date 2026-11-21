"use client";

import { useState, useTransition } from "react";
import { registrarPagoCuentaCorriente } from "@/app/(app)/clientes/actions";
import { FORMA_PAGO_LABEL, formatMoney } from "@/lib/format";
import { todayInputValue } from "@/lib/date";

type FormaPago = keyof typeof FORMA_PAGO_LABEL;

// Pago a cuenta: el monto se reparte entre las ventas que debe, de la mas
// vieja a la mas nueva (ver registrarPagoCuentaCorriente).
export function PagoCuentaCorrienteForm({ clienteId, saldo }: { clienteId: string; saldo: number }) {
  const [abierto, setAbierto] = useState(false);
  const [monto, setMonto] = useState("");
  const [formaPago, setFormaPago] = useState<FormaPago | "">("");
  const [fecha, setFecha] = useState(() => todayInputValue());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function cerrar() {
    setAbierto(false);
    setMonto("");
    setFormaPago("");
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await registrarPagoCuentaCorriente(clienteId, { monto, formaPago: formaPago || null, fecha });
        cerrar();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al registrar el pago.");
      }
    });
  }

  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)} className="btn-primary text-sm">
        Registrar pago
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t-2 border-navy/10 pt-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          type="number"
          step="0.01"
          min="0.01"
          max={saldo}
          placeholder="Monto que paga"
          className="input-chunky"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          required
          autoFocus
        />
        <select
          className="input-chunky"
          value={formaPago}
          onChange={(e) => setFormaPago(e.target.value as FormaPago | "")}
        >
          <option value="">Forma de pago</option>
          {Object.entries(FORMA_PAGO_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="input-chunky"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          required
        />
      </div>
      <button
        type="button"
        onClick={() => setMonto(String(saldo))}
        className="text-xs font-bold text-navy/60 hover:underline self-start"
      >
        Paga todo ({formatMoney(saldo)})
      </button>
      {error && <p className="text-xs font-bold text-rosa">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-primary text-sm">
          {pending ? "Registrando..." : "Confirmar pago"}
        </button>
        <button type="button" onClick={cerrar} className="btn-secondary text-sm">
          Cancelar
        </button>
      </div>
    </form>
  );
}
