"use client";

import { useState, useTransition } from "react";
import { ajustarStock } from "@/app/(app)/productos/actions";

export function StockEditor({ productoId, stockActual }: { productoId: string; stockActual: number }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(String(stockActual));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!editando) {
    return (
      <button
        onClick={() => setEditando(true)}
        className="font-black text-lg hover:underline decoration-dashed"
        title="Ajustar stock manualmente"
      >
        {stockActual}
      </button>
    );
  }

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          try {
            await ajustarStock(productoId, Number(valor));
            setEditando(false);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Error");
          }
        });
      }}
    >
      <input
        type="number"
        min="0"
        className="input-chunky w-24 py-1"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        autoFocus
      />
      <button type="submit" disabled={pending} className="btn-secondary text-xs py-1.5">
        OK
      </button>
      {error && <span className="text-xs font-bold text-rosa">{error}</span>}
    </form>
  );
}
