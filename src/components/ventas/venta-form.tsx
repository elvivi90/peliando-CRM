"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { crearVenta, previsualizarPrecio } from "@/app/(app)/ventas/actions";
import { formatMoney } from "@/lib/format";
import { todayInputValue } from "@/lib/date";

type Cliente = { id: string; nombre: string; apellido: string; tipo: string };
type Producto = { id: string; nombre: string; stockActual: number };
type Evento = { id: string; nombre: string };

type Preview = {
  tipo: string;
  precioUnitario: number;
  precioTotal: number;
  editable: boolean;
} | null;

export function VentaForm({
  clientes,
  productos,
  eventos,
}: {
  clientes: Cliente[];
  productos: Producto[];
  eventos: Evento[];
}) {
  const [clienteId, setClienteId] = useState("");
  const [productoId, setProductoId] = useState(productos[0]?.id ?? "");
  const [eventoId, setEventoId] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [precioManual, setPrecioManual] = useState("");
  const [usarPrecioManual, setUsarPrecioManual] = useState(false);
  const [entregaParcial, setEntregaParcial] = useState(false);
  const [cantidadEntregada, setCantidadEntregada] = useState("1");
  const [montoCobrado, setMontoCobrado] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState(() => todayInputValue());

  const [fetchedPreview, setFetchedPreview] = useState<Preview>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const clienteSeleccionado = clientes.find((c) => c.id === clienteId);
  const esConcesion = clienteSeleccionado?.tipo === "CONCESION";
  const cantidadNum = Number(cantidad) || 0;
  const consultaValida = Boolean(clienteId) && !esConcesion && cantidadNum > 0;
  const preview = consultaValida ? fetchedPreview : null;
  const cantidadEntregadaFinal = entregaParcial ? cantidadEntregada : cantidad;

  useEffect(() => {
    if (!consultaValida) return;
    let activo = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- flag de carga de un fetch legitimo
    setPreviewLoading(true);
    previsualizarPrecio(clienteId, cantidadNum).then((res) => {
      if (!activo) return;
      setFetchedPreview(res);
      setPreviewLoading(false);
      if (res && montoCobrado === "") {
        setMontoCobrado(res.tipo === "MINORISTA" ? String(res.precioTotal) : "0");
      }
    });
    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId, cantidadNum, consultaValida]);

  const precioTotalFinal = useMemo(() => {
    if (!preview) return 0;
    if (usarPrecioManual && precioManual) return Number(precioManual) * cantidadNum;
    return preview.precioTotal;
  }, [preview, usarPrecioManual, precioManual, cantidadNum]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (esConcesion) {
      setError(
        "Este cliente es de tipo Concesión. Cargá la entrega y liquidación desde la sección Concesión.",
      );
      return;
    }

    startTransition(async () => {
      try {
        await crearVenta({
          clienteId,
          productoId,
          eventoId,
          cantidad,
          cantidadEntregada: cantidadEntregadaFinal,
          precioUnitarioManual: usarPrecioManual && precioManual ? precioManual : undefined,
          montoCobrado: montoCobrado || "0",
          descripcion,
          fecha,
        });
      } catch (err) {
        const digest = (err as { digest?: string })?.digest;
        if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw err;
        setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card-chunky p-6 flex flex-col gap-5 max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Cliente" required>
          <select
            className="input-chunky"
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            required
          >
            <option value="">Elegir cliente...</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} {c.apellido} ({c.tipo.toLowerCase()})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Producto" required>
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
        </Field>
      </div>

      {esConcesion && (
        <p className="text-sm bg-rosa/15 border-2 border-rosa rounded-xl px-4 py-3 font-semibold text-rosa">
          Este cliente es de tipo Concesión: gestioná entrega y liquidación desde la sección
          Concesión, no desde acá.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Cantidad" required>
          <input
            type="number"
            min="1"
            className="input-chunky"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            required
          />
        </Field>
        <Field label="Evento (opcional)">
          <select
            className="input-chunky"
            value={eventoId}
            onChange={(e) => setEventoId(e.target.value)}
          >
            <option value="">Sin evento</option>
            {eventos.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.nombre}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {clienteId && !esConcesion && (
        <div className="rounded-xl border-2 border-navy bg-amarillo/15 px-4 py-3.5 flex flex-col gap-2">
          {previewLoading ? (
            <span className="text-sm font-semibold">Calculando precio...</span>
          ) : preview ? (
            <>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-extrabold uppercase text-navy/60">
                  Precio {preview.editable ? "sugerido" : "(fórmula distribuidor, fijo)"}
                </span>
                <span className="font-black text-lg">
                  {formatMoney(usarPrecioManual && precioManual ? Number(precioManual) : preview.precioUnitario)}{" "}
                  <span className="text-xs font-semibold text-navy/50">c/u</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-sm font-bold">
                <span>Total</span>
                <span>{formatMoney(precioTotalFinal)}</span>
              </div>
              {preview.editable && (
                <label className="flex items-center gap-2 mt-1 text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={usarPrecioManual}
                    onChange={(e) => setUsarPrecioManual(e.target.checked)}
                  />
                  Cargar precio manual (descuento puntual / acuerdo particular)
                </label>
              )}
              {usarPrecioManual && (
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input-chunky"
                  placeholder="Precio unitario manual"
                  value={precioManual}
                  onChange={(e) => setPrecioManual(e.target.value)}
                />
              )}
            </>
          ) : (
            <span className="text-sm font-semibold text-rosa">
              No se pudo calcular un precio (¿hay una lista de precios activa?).
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Fecha" required>
          <input
            type="date"
            className="input-chunky"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
          />
        </Field>
        <Field label="Monto cobrado ahora">
          <input
            type="number"
            step="0.01"
            min="0"
            className="input-chunky"
            value={montoCobrado}
            onChange={(e) => setMontoCobrado(e.target.value)}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-xs font-bold">
          <input
            type="checkbox"
            checked={entregaParcial}
            onChange={(e) => {
              setEntregaParcial(e.target.checked);
              if (e.target.checked) setCantidadEntregada(cantidad);
            }}
          />
          Entrega parcial (no se entrega toda la cantidad todavía)
        </label>
        {entregaParcial && (
          <Field label="Cantidad entregada ahora">
            <input
              type="number"
              min="0"
              max={cantidad}
              className="input-chunky"
              value={cantidadEntregada}
              onChange={(e) => setCantidadEntregada(e.target.value)}
            />
          </Field>
        )}
      </div>

      <Field label="Descripción (opcional)">
        <textarea
          className="input-chunky resize-none"
          rows={2}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
      </Field>

      {error && (
        <p className="text-sm font-bold text-rosa" role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={pending || esConcesion} className="btn-primary self-start">
        {pending ? "Guardando..." : "Registrar venta"}
      </button>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-extrabold uppercase tracking-wide text-navy/70">
        {label}
        {required && <span className="text-rosa"> *</span>}
      </span>
      {children}
    </label>
  );
}
