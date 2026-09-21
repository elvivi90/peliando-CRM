"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { formatMoney } from "@/lib/format";

export type TramoOpcion = { id: string; cantidadDesde: number; precioUnitario: number };

// Lista de tramos de la lista de precios del cliente, con el tramo aplicado
// hoy preseleccionado. Elegir otro cambia el precio unitario de la venta.
export function ModalTramos({
  listaNombre,
  tramos,
  cantidad,
  tramoActualId,
  tramoSugeridoId,
  esDistribuidor,
  onAplicar,
  onClose,
}: {
  listaNombre: string;
  tramos: TramoOpcion[];
  cantidad: number;
  tramoActualId: string | null;
  // El que corresponde a la cantidad (se marca como "Sugerido")
  tramoSugeridoId: string | null;
  esDistribuidor: boolean;
  // null = volver al automatico (el que corresponde a la cantidad)
  onAplicar: (tramoId: string | null) => void;
  onClose: () => void;
}) {
  const [seleccionado, setSeleccionado] = useState(tramoActualId);
  const ordenados = [...tramos].sort((a, b) => a.cantidadDesde - b.cantidadDesde);

  function aplicar() {
    // Elegir el sugerido equivale a dejarlo automatico (sigue a la cantidad)
    onAplicar(seleccionado === tramoSugeridoId ? null : seleccionado);
  }

  return (
    <Modal titulo="Elegí el tramo" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-sm font-semibold text-navy/70">
          Lista «{listaNombre}» · {cantidad} un.
          {esDistribuidor && " · precios con el −20% de distribuidor ya aplicado"}
        </p>

        <div role="radiogroup" aria-label="Tramo de precio" className="flex flex-col gap-2">
          {ordenados.map((t, i) => {
            const siguiente = ordenados[i + 1];
            const rango = siguiente
              ? `${t.cantidadDesde} a ${siguiente.cantidadDesde - 1} un.`
              : `${t.cantidadDesde} un. o más`;
            const activo = t.id === seleccionado;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={activo}
                onClick={() => setSeleccionado(t.id)}
                className={`flex items-center justify-between gap-3 rounded-xl border-navy px-3.5 py-2.5 text-left ${
                  activo ? "bg-amarillo border-[3px]" : "bg-tarjeta border-2"
                }`}
              >
                <span>
                  <span className="block text-sm font-extrabold">Desde {t.cantidadDesde} un.</span>
                  <span className="block text-xs text-navy/60">
                    {rango}
                    {t.id === tramoSugeridoId && (
                      <span className="ml-1.5 rounded-full bg-navy px-2 py-0.5 text-[10px] font-black uppercase text-tarjeta">
                        Sugerido
                      </span>
                    )}
                  </span>
                </span>
                <span className="font-black">
                  {formatMoney(t.precioUnitario)}
                  <span className="ml-1 text-xs font-semibold text-navy/55">c/u</span>
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={aplicar}
          disabled={!seleccionado}
          className="btn-primary w-full"
        >
          Aplicar tramo
        </button>
        <button type="button" onClick={onClose} className="text-sm font-bold text-navy/60 underline">
          Cancelar
        </button>
      </div>
    </Modal>
  );
}
