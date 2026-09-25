"use client";

import { useState, useTransition } from "react";
import { crearGasto } from "@/app/(app)/gastos/actions";
import { todayInputValue } from "@/lib/date";
import { formatMoney } from "@/lib/format";

const TIPOS = [
  { value: "OPERATIVO", label: "Operativo" },
  { value: "INVERSION", label: "Inversión" },
] as const;

const CATEGORIAS = [
  { value: "TRANSPORTE", label: "Transporte" },
  { value: "COMIDA", label: "Comida" },
  { value: "MARKETING_PRODUCCION", label: "Marketing / Producción" },
  { value: "OTROS", label: "Otros" },
] as const;

export function GastoForm({ eventos }: { eventos: { id: string; nombre: string }[] }) {
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]["value"]>("OPERATIVO");
  const [categoria, setCategoria] = useState<string>("TRANSPORTE");
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(() => todayInputValue());
  const [eventoId, setEventoId] = useState("");
  const [unidadesGeneradas, setUnidadesGeneradas] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const esInversion = tipo === "INVERSION";
  const esProduccion = esInversion && categoria === "MARKETING_PRODUCCION";
  // Solo de referencia: el valor que se guarda lo calcula el servidor.
  const montoNum = Number(monto);
  const unidadesNum = Number(unidadesGeneradas);
  const costoUnitario =
    montoNum > 0 && Number.isInteger(unidadesNum) && unidadesNum > 0 ? montoNum / unidadesNum : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await crearGasto({
          tipo,
          categoria,
          concepto,
          monto,
          fecha,
          // En el esquema de Figma la inversion no tiene evento: es capital, no
          // un gasto de una feria.
          eventoId: esInversion ? "" : eventoId,
          unidadesGeneradas: esProduccion ? unidadesGeneradas : "",
        });
      } catch (err) {
        const digest = (err as { digest?: string })?.digest;
        if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw err;
        setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card-chunky p-6 flex flex-col gap-4 max-w-lg">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-extrabold uppercase tracking-wide text-navy/70">Tipo *</span>
        <div
          role="radiogroup"
          aria-label="Tipo de gasto"
          className="flex self-start rounded-xl border-2 border-navy overflow-hidden"
        >
          {TIPOS.map((t) => {
            const activo = tipo === t.value;
            const colorActivo = t.value === "INVERSION" ? "bg-rosa text-white" : "bg-amarillo text-navy";
            return (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={activo}
                onClick={() => setTipo(t.value)}
                className={`px-5 py-2 text-sm ${
                  activo ? `${colorActivo} font-black` : "bg-tarjeta text-navy/45 font-bold"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-extrabold uppercase tracking-wide text-navy/70">
          Categoría *
        </span>
        <select className="input-chunky" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          {CATEGORIAS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-extrabold uppercase tracking-wide text-navy/70">
          Concepto *
        </span>
        <input
          className="input-chunky"
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
          placeholder="Nafta ida y vuelta feria"
          required
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-extrabold uppercase tracking-wide text-navy/70">
            Monto *
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input-chunky"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-extrabold uppercase tracking-wide text-navy/70">
            Fecha *
          </span>
          <input
            type="date"
            className="input-chunky"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
          />
        </label>
      </div>

      {esProduccion && (
        <div className="rounded-2xl bg-rosa/10 p-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-extrabold uppercase tracking-wide text-navy/70">
              Unidades generadas *
            </span>
            <input
              type="number"
              step="1"
              min="1"
              inputMode="numeric"
              className="input-chunky self-start w-32"
              value={unidadesGeneradas}
              onChange={(e) => setUnidadesGeneradas(e.target.value)}
              required
            />
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-extrabold uppercase tracking-wide text-navy/70">
              Costo unitario (calculado)
            </span>
            <div className="input-chunky self-start text-navy/45" aria-live="polite">
              {costoUnitario === null ? "—" : `${formatMoney(costoUnitario)} c/u`}
            </div>
          </div>
        </div>
      )}

      {!esInversion && (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-extrabold uppercase tracking-wide text-navy/70">
            Evento (opcional)
          </span>
          <select className="input-chunky" value={eventoId} onChange={(e) => setEventoId(e.target.value)}>
            <option value="">Sin evento</option>
            {eventos.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.nombre}
              </option>
            ))}
          </select>
        </label>
      )}

      {error && <p className="text-sm font-bold text-rosa">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className={`btn-primary self-start ${esInversion ? "bg-rosa" : ""}`}
      >
        {pending ? "Guardando..." : "Registrar gasto"}
      </button>
    </form>
  );
}
