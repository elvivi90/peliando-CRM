"use client";

import { useEffect, useState, useTransition } from "react";
import {
  crearVenta,
  actualizarVenta,
  previsualizarPrecio,
  type PrevisualizacionPrecio,
} from "@/app/(app)/ventas/actions";
import { formatDate, formatMoney } from "@/lib/format";
import { parseFechaInput, todayInputValue } from "@/lib/date";
import { SelectorConAlta } from "@/components/ventas/selector-con-alta";
import { ModalClienteRapido, type ClienteCreado } from "@/components/ventas/modal-cliente-rapido";
import { ModalEventoRapido, type EventoCreado } from "@/components/ventas/modal-evento-rapido";
import { ModalTramos } from "@/components/ventas/modal-tramos";

type Cliente = { id: string; nombre: string; apellido: string; tipo: string };
type Producto = { id: string; nombre: string; stockActual: number };
type Evento = { id: string; nombre: string };

// RAPIDA = minorista sin cliente (ideal para eventos).
// MAYORISTA = con cliente (mayorista o distribuidor), precio por tramo.
type Modo = "RAPIDA" | "MAYORISTA";

const TOTAL_PASOS = 4;

// Venta existente que se edita (ver /ventas/[id]/editar).
export type VentaEditable = {
  id: string;
  tipo: string;
  clienteId: string | null;
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  precioTotal: number;
  montoCobrado: number;
  costoEnvio: number;
  eventoId: string | null;
  fecha: string;
  // Solo liquidaciones de concesion: cliente y producto quedan fijos, el
  // precio es el cobrado (no sale de la lista) y la cantidad tiene tope.
  concesion: { maxCantidad: number | null } | null;
};

export function VentaForm({
  clientes: clientesIniciales,
  productos,
  eventos: eventosIniciales,
  venta,
}: {
  clientes: Cliente[];
  productos: Producto[];
  eventos: Evento[];
  venta?: VentaEditable;
}) {
  const esConcesion = Boolean(venta?.concesion);
  // Venta minorista con cliente (las de Tiendup, o manuales viejas): se edita
  // como venta rapida pero conserva su cliente.
  const clienteMinoristaId = venta?.tipo === "MINORISTA" ? venta.clienteId : null;
  const [paso, setPaso] = useState(1);
  const [modo, setModo] = useState<Modo>(
    venta?.clienteId && venta.tipo !== "MINORISTA" ? "MAYORISTA" : "RAPIDA",
  );

  const [clientes, setClientes] = useState(clientesIniciales);
  const [eventos, setEventos] = useState(eventosIniciales);

  const [clienteId, setClienteId] = useState(venta?.clienteId ?? "");
  const [productoId, setProductoId] = useState(venta?.productoId ?? productos[0]?.id ?? "");
  const [cantidad, setCantidad] = useState(venta ? String(venta.cantidad) : "1");
  // Al editar, mientras no se toquen cliente, cantidad ni tramo se conserva
  // el precio guardado en vez de recalcularlo con la lista de hoy.
  const [tocoPrecio, setTocoPrecio] = useState(false);
  // null = usar el precio sugerido; string = el usuario lo editó
  const [precioEditado, setPrecioEditado] = useState<string | null>(null);
  const [editandoPrecio, setEditandoPrecio] = useState(false);
  // null = el tramo que corresponde a la cantidad; string = elegido a mano
  const [tramoElegido, setTramoElegido] = useState<string | null>(null);

  const [fecha, setFecha] = useState(() => venta?.fecha ?? todayInputValue());
  const [eventoId, setEventoId] = useState(venta?.eventoId ?? "");
  // null = usar el monto por defecto (rápida: total cobrado; mayorista: 0)
  const [montoInput, setMontoInput] = useState<string | null>(null);
  // Lo que le cuesta a Peliando el envío; vacío = sin envío.
  const [costoEnvio, setCostoEnvio] = useState(venta?.costoEnvio ? String(venta.costoEnvio) : "");

  const [clienteCreado, setClienteCreado] = useState(false);
  const [eventoCreado, setEventoCreado] = useState(false);
  const [modal, setModal] = useState<"cliente" | "evento" | "tramo" | null>(null);

  const [fetchedPreview, setFetchedPreview] = useState<PrevisualizacionPrecio>(null);
  const [cargandoPrecio, setCargandoPrecio] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const cantidadNum = Number(cantidad) || 0;
  const clienteConsulta = modo === "MAYORISTA" ? clienteId : (clienteMinoristaId ?? "");
  const consultaValida = cantidadNum > 0 && (modo === "RAPIDA" || Boolean(clienteId));
  // Una liquidacion no tiene precio de lista: la caja muestra el cobrado.
  const preview: PrevisualizacionPrecio =
    esConcesion && venta
      ? {
          tipo: "CONCESION",
          precioUnitario: venta.precioUnitario,
          precioTotal: venta.precioUnitario * cantidadNum,
          editable: true,
          origen: "PARTICULAR",
          tramoDesde: null,
          tramoId: null,
          tramoSugeridoId: null,
          listaNombre: "",
          tramos: [],
        }
      : consultaValida
        ? fetchedPreview
        : null;

  useEffect(() => {
    if (!consultaValida || esConcesion) return;
    let activo = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- flag de carga de un fetch legitimo
    setCargandoPrecio(true);
    previsualizarPrecio(clienteConsulta || null, cantidadNum, tramoElegido).then((res) => {
      if (!activo) return;
      setFetchedPreview(res);
      setCargandoPrecio(false);
    });
    return () => {
      activo = false;
    };
  }, [clienteConsulta, cantidadNum, consultaValida, tramoElegido, esConcesion]);

  const productoSel = productos.find((p) => p.id === productoId);
  const clienteSel = clientes.find((c) => c.id === clienteId);
  // Al editar, las unidades de la venta vuelven al stock antes de descontar.
  const stockDisponible =
    (productoSel?.stockActual ?? 0) + (venta && venta.productoId === productoId ? venta.cantidad : 0);
  const consumoExtra =
    venta && venta.productoId === productoId ? cantidadNum - venta.cantidad : cantidadNum;
  // La liquidacion no mueve stock (salio al entregar la concesion).
  const sinStock =
    !esConcesion && Boolean(productoSel && consumoExtra > 0 && cantidadNum > stockDisponible);
  const maxConcesion = venta?.concesion?.maxCantidad ?? null;
  const excedeConcesion = maxConcesion !== null && cantidadNum > maxConcesion;

  const mantenerPrecio = Boolean(venta) && (esConcesion || !tocoPrecio);
  const precioBase = mantenerPrecio && venta ? venta.precioUnitario : (preview?.precioUnitario ?? 0);
  const precioEditable = preview?.editable ?? false;
  const precioUnitario = (() => {
    if (!preview) return 0;
    if (precioEditable && precioEditado !== null && precioEditado !== "") return Number(precioEditado);
    return precioBase;
  })();
  const precioValido = Number.isFinite(precioUnitario) && precioUnitario >= 0;
  const precioTotal = precioUnitario * cantidadNum;

  // Por defecto: rapida = cobrada entera, mayorista = nada. Al editar, una
  // venta que estaba cobrada entera sigue cobrada entera con el total nuevo;
  // si no, se mantiene lo cobrado.
  const montoPorDefecto = venta
    ? venta.montoCobrado >= venta.precioTotal
      ? precioTotal
      : venta.montoCobrado
    : modo === "RAPIDA"
      ? precioTotal
      : 0;
  const montoFinal = montoInput ?? String(montoPorDefecto);
  const montoNum = Number(montoFinal);
  const montoValido = Number.isFinite(montoNum) && montoNum >= 0 && montoNum <= precioTotal + 0.005;
  const costoEnvioNum = costoEnvio === "" ? 0 : Number(costoEnvio);
  const costoEnvioValido = Number.isFinite(costoEnvioNum) && costoEnvioNum >= 0;

  const puedeAvanzarPaso2 =
    consultaValida &&
    !cargandoPrecio &&
    Boolean(preview) &&
    precioValido &&
    !sinStock &&
    !excedeConcesion &&
    Boolean(productoId);
  const puedeAvanzarPaso3 = Boolean(fecha) && montoValido && costoEnvioValido;

  function irA(n: number) {
    setError(null);
    setPaso(n);
  }

  function elegirModo(m: Modo) {
    setModo(m);
    setPrecioEditado(null);
    setTramoElegido(null);
    setTocoPrecio(true);
  }

  function handleCantidad(v: string) {
    setCantidad(v);
    setPrecioEditado(null);
    setTramoElegido(null);
    setTocoPrecio(true);
  }

  function handleCliente(id: string) {
    setClienteId(id);
    setClienteCreado(false);
    setPrecioEditado(null);
    setTramoElegido(null);
    setTocoPrecio(true);
  }

  function handleClienteCreado(c: ClienteCreado) {
    setClientes((prev) => [...prev, c]);
    setClienteId(c.id);
    setClienteCreado(true);
    setPrecioEditado(null);
    setTramoElegido(null);
    setTocoPrecio(true);
    setModal(null);
  }

  function handleTramoAplicado(id: string | null) {
    setTramoElegido(id);
    setPrecioEditado(null);
    setTocoPrecio(true);
    setModal(null);
  }

  function handleEventoCreado(e: EventoCreado) {
    setEventos((prev) => [{ id: e.id, nombre: e.nombre }, ...prev]);
    setEventoId(e.id);
    setEventoCreado(true);
    setModal(null);
  }

  function registrar() {
    setError(null);
    const precioManual =
      preview &&
      precioEditable &&
      precioEditado !== null &&
      precioEditado !== "" &&
      Number(precioEditado) !== precioBase
        ? precioEditado
        : undefined;

    startTransition(async () => {
      try {
        const input = {
          clienteId: modo === "MAYORISTA" ? clienteId : (clienteMinoristaId ?? ""),
          productoId,
          eventoId,
          cantidad,
          // El diseño no tiene entrega parcial: se entrega todo. Lo pendiente
          // se puede ajustar después desde el detalle de la venta. Al editar
          // lo ignora el servidor, que ajusta las entregas que ya existen.
          cantidadEntregada: cantidad,
          precioUnitarioManual: precioManual,
          tramoId: tramoElegido ?? "",
          montoCobrado: montoFinal || "0",
          costoEnvio: costoEnvio || "0",
          fecha,
        };
        if (venta) await actualizarVenta(venta.id, input, mantenerPrecio);
        else await crearVenta(input);
      } catch (err) {
        const digest = (err as { digest?: string })?.digest;
        if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw err;
        setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
      }
    });
  }

  const opcionesClientes = clientes
    .filter((c) => c.tipo === "MAYORISTA" || c.tipo === "DISTRIBUIDOR" || c.id === venta?.clienteId)
    .map((c) => ({
      id: c.id,
      label: `${`${c.nombre} ${c.apellido}`.trim()} (${c.tipo.toLowerCase()})`,
    }));
  const opcionesEventos = eventos.map((e) => ({ id: e.id, label: e.nombre }));
  const eventoSel = eventos.find((e) => e.id === eventoId);
  const clienteMinorista = clientes.find((c) => c.id === clienteMinoristaId);
  const nombreClienteMinorista = clienteMinorista
    ? `${clienteMinorista.nombre} ${clienteMinorista.apellido}`.trim()
    : null;

  return (
    <>
      <div className="card-chunky p-6 flex flex-col gap-5 max-w-md mx-auto">
        <Stepper paso={paso} />

        {paso === 1 && (
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              irA(2);
            }}
          >
            <Encabezado titulo="¿Qué tipo de venta?" subtitulo="Define el resto del flujo" />
            {esConcesion ? (
              <OpcionTipo
                activo
                onClick={() => {}}
                icono={<IconoLocal />}
                titulo="Liquidación de concesión"
                detalle="Cliente y producto son los de la concesión"
              />
            ) : (
              <div role="radiogroup" aria-label="Tipo de venta" className="flex flex-col gap-2.5">
                <OpcionTipo
                  activo={modo === "RAPIDA"}
                  onClick={() => elegirModo("RAPIDA")}
                  icono={<IconoRayo />}
                  titulo={nombreClienteMinorista ? "Venta minorista" : "Venta rápida"}
                  detalle={
                    nombreClienteMinorista
                      ? `Cliente: ${nombreClienteMinorista}`
                      : "Sin cliente — ideal para eventos"
                  }
                />
                <OpcionTipo
                  activo={modo === "MAYORISTA"}
                  onClick={() => elegirModo("MAYORISTA")}
                  icono={<IconoLocal />}
                  titulo="Mayorista/Distribuidor"
                  detalle="Con cliente, precio por tramo"
                />
              </div>
            )}
            <div className="flex gap-2.5">
              <button type="submit" className="btn-primary">
                Siguiente →
              </button>
            </div>
          </form>
        )}

        {paso === 2 && (
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (puedeAvanzarPaso2) irA(3);
            }}
          >
            {modo === "RAPIDA" ? (
              <Encabezado titulo="Producto y precio" subtitulo="Cantidad y precio en un solo paso" />
            ) : (
              <Encabezado
                titulo="Cliente, producto y precio"
                subtitulo="El precio depende del cliente y la cantidad"
              />
            )}

            {modo === "RAPIDA" && nombreClienteMinorista && (
              <Campo label="Cliente">
                <span className="font-semibold">{nombreClienteMinorista}</span>
              </Campo>
            )}

            {esConcesion && (
              <Campo label="Cliente">
                <span className="font-semibold">
                  {clienteSel ? `${clienteSel.nombre} ${clienteSel.apellido}`.trim() : "—"}
                </span>
              </Campo>
            )}

            {modo === "MAYORISTA" && !esConcesion && (
              <Campo
                label="Cliente"
                required
                insignia={clienteCreado ? { texto: "Creado recién", tono: "amarillo" } : undefined}
              >
                <SelectorConAlta
                  value={clienteId}
                  opciones={opcionesClientes}
                  onChange={handleCliente}
                  placeholder="Buscar cliente..."
                  buscador
                  crearLabel="Crear cliente nuevo"
                  onCrear={() => setModal("cliente")}
                  tono="amarillo"
                />
                <button
                  type="button"
                  onClick={() => setModal("cliente")}
                  className="w-full text-left rounded-lg bg-amarillo/25 hover:bg-amarillo/40 px-3 py-1.5 text-xs font-extrabold"
                >
                  + ¿No está en la lista? Crear cliente nuevo
                </button>
              </Campo>
            )}

            <Campo label="Producto" required>
              <select
                className="input-chunky"
                value={productoId}
                onChange={(e) => setProductoId(e.target.value)}
                disabled={esConcesion}
                required
              >
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} (stock: {p.stockActual})
                  </option>
                ))}
              </select>
            </Campo>

            <Campo label="Cantidad" required>
              <input
                type="number"
                min="1"
                inputMode="numeric"
                className="input-chunky w-24"
                value={cantidad}
                onChange={(e) => handleCantidad(e.target.value)}
                required
              />
              {sinStock && productoSel && (
                <span className="text-xs font-bold text-rosa">
                  Stock insuficiente (disponible: {stockDisponible}).
                </span>
              )}
              {excedeConcesion && (
                <span className="text-xs font-bold text-rosa">
                  En esta concesión quedan {maxConcesion} unidades para liquidar.
                </span>
              )}
            </Campo>

            {(consultaValida || esConcesion) && (
              <CajaPrecio
                cargando={cargandoPrecio}
                preview={preview}
                precioUnitario={precioUnitario}
                editando={editandoPrecio}
                onEditar={() => setEditandoPrecio(true)}
                onFinEdicion={() => setEditandoPrecio(false)}
                valorEditado={precioEditado}
                onCambio={setPrecioEditado}
                tramoElegido={tramoElegido !== null}
                onCambiarTramo={() => setModal("tramo")}
                precioGuardado={mantenerPrecio}
              />
            )}

            <Navegacion onAtras={() => irA(1)} siguienteDeshabilitado={!puedeAvanzarPaso2} />
          </form>
        )}

        {paso === 3 && (
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (puedeAvanzarPaso3) irA(4);
            }}
          >
            <Encabezado titulo="Evento y fecha" subtitulo="Opcional agrupar por evento" />

            <Campo label="Fecha" required>
              <input
                type="date"
                className="input-chunky w-44"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
              />
            </Campo>

            <Campo
              label="Evento"
              insignia={eventoCreado ? { texto: "Creado recién", tono: "rosa" } : undefined}
            >
              <SelectorConAlta
                value={eventoId}
                opciones={opcionesEventos}
                onChange={(id) => {
                  setEventoId(id);
                  setEventoCreado(false);
                }}
                placeholder="Sin evento (opcional)"
                vacioLabel="Sin evento (opcional)"
                crearLabel="Crear evento nuevo"
                onCrear={() => setModal("evento")}
                tono="rosa"
              />
            </Campo>

            <Campo label={venta ? "Monto cobrado" : "Monto cobrado ahora"}>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                className="input-chunky w-40"
                value={montoFinal}
                onChange={(e) => setMontoInput(e.target.value)}
              />
              {!montoValido && (
                <span className="text-xs font-bold text-rosa">
                  El monto cobrado no puede superar el total ({formatMoney(precioTotal)}).
                </span>
              )}
            </Campo>

            <Campo label="Costo de envío">
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="Sin envío"
                className="input-chunky w-40"
                value={costoEnvio}
                onChange={(e) => setCostoEnvio(e.target.value)}
              />
              <span className="text-xs text-navy/55">
                Lo paga Peliando: no cambia el precio y suma como gasto del mes.
              </span>
            </Campo>

            <Navegacion onAtras={() => irA(2)} siguienteDeshabilitado={!puedeAvanzarPaso3} />
          </form>
        )}

        {paso === 4 && (
          <div className="flex flex-col gap-5">
            <Encabezado
              titulo={venta ? "Confirmar cambios" : "Confirmar venta"}
              subtitulo={venta ? "Revisá antes de guardar" : "Revisá antes de registrar"}
            />

            <dl className="rounded-xl border-2 border-navy px-4 py-3 flex flex-col gap-1.5 text-sm">
              <FilaResumen
                label="Tipo"
                value={
                  esConcesion
                    ? "Liquidación de concesión"
                    : modo === "RAPIDA"
                      ? nombreClienteMinorista
                        ? "Venta minorista"
                        : "Venta rápida"
                      : preview?.tipo === "DISTRIBUIDOR"
                        ? "Distribuidor"
                        : "Mayorista"
                }
              />
              {modo === "RAPIDA" && nombreClienteMinorista && (
                <FilaResumen label="Cliente" value={nombreClienteMinorista} />
              )}
              {modo === "MAYORISTA" && clienteSel && (
                <FilaResumen
                  label="Cliente"
                  value={`${clienteSel.nombre} ${clienteSel.apellido}`.trim()}
                />
              )}
              <FilaResumen label="Producto" value={`${productoSel?.nombre ?? "—"} x${cantidadNum}`} />
              {preview?.origen === "TRAMO" && !mantenerPrecio && (
                <FilaResumen
                  label="Tramo"
                  value={`Desde ${preview.tramoDesde} un.${tramoElegido !== null ? " (elegido)" : ""}`}
                />
              )}
              <FilaResumen label="Precio" value={formatMoney(precioTotal)} />
              <FilaResumen label="Fecha" value={formatDate(parseFechaInput(fecha))} />
              {eventoSel && <FilaResumen label="Evento" value={eventoSel.nombre} />}
              <FilaResumen label={venta ? "Cobrado" : "Cobrado ahora"} value={formatMoney(montoNum)} />
              {costoEnvioNum > 0 && (
                <FilaResumen label="Costo de envío" value={formatMoney(costoEnvioNum)} />
              )}
            </dl>

            {error && (
              <p className="text-sm font-bold text-rosa" role="alert">
                {error}
              </p>
            )}

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => irA(3)}
                disabled={pending}
                className="btn-secondary text-sm"
              >
                ← Atrás
              </button>
              <button type="button" onClick={registrar} disabled={pending} className="btn-primary">
                {pending ? "Guardando..." : venta ? "✓ Guardar cambios" : "✓ Registrar venta"}
              </button>
            </div>
          </div>
        )}
      </div>

      {modal === "cliente" && (
        <ModalClienteRapido onCreado={handleClienteCreado} onClose={() => setModal(null)} />
      )}
      {modal === "evento" && (
        <ModalEventoRapido
          fechaInicial={fecha}
          onCreado={handleEventoCreado}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "tramo" && preview && (
        <ModalTramos
          listaNombre={preview.listaNombre}
          tramos={preview.tramos}
          cantidad={cantidadNum}
          tramoActualId={preview.tramoId}
          tramoSugeridoId={preview.tramoSugeridoId}
          esDistribuidor={preview.tipo === "DISTRIBUIDOR"}
          onAplicar={handleTramoAplicado}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

function Stepper({ paso }: { paso: number }) {
  return (
    <ol className="flex items-center gap-1.5" aria-label={`Paso ${paso} de ${TOTAL_PASOS}`}>
      {Array.from({ length: TOTAL_PASOS }, (_, i) => i + 1).map((n) => (
        <li
          key={n}
          className="flex items-center gap-1.5"
          aria-current={n === paso ? "step" : undefined}
        >
          {n > 1 && <span aria-hidden className="w-4 h-0.5 bg-navy/25" />}
          <span
            className={`grid place-items-center size-7 rounded-full border-2 text-xs font-black ${
              n === paso ? "bg-amarillo border-navy text-navy" : "border-navy/30 text-navy/50"
            }`}
          >
            {n}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Encabezado({ titulo, subtitulo }: { titulo: string; subtitulo: string }) {
  return (
    <div>
      <h2 className="text-xl font-black">{titulo}</h2>
      <p className="text-sm text-navy/60 mt-0.5">{subtitulo}</p>
    </div>
  );
}

function OpcionTipo({
  activo,
  onClick,
  icono,
  titulo,
  detalle,
}: {
  activo: boolean;
  onClick: () => void;
  icono: React.ReactNode;
  titulo: string;
  detalle: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={activo}
      onClick={onClick}
      className={`flex items-center gap-3 text-left rounded-xl border-navy px-3.5 py-2.5 ${
        activo ? "bg-amarillo border-[3px]" : "bg-tarjeta border-2"
      }`}
    >
      <span className="shrink-0">{icono}</span>
      <span>
        <span className="block font-extrabold text-sm">{titulo}</span>
        <span className="block text-xs text-navy/60">{detalle}</span>
      </span>
    </button>
  );
}

function Campo({
  label,
  required,
  insignia,
  children,
}: {
  label: string;
  required?: boolean;
  insignia?: { texto: string; tono: "amarillo" | "rosa" };
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-extrabold uppercase tracking-wide text-navy/70">
          {label}
          {required && <span className="text-rosa"> *</span>}
        </span>
        {insignia && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
              insignia.tono === "rosa" ? "bg-rosa text-white" : "bg-amarillo text-navy"
            }`}
          >
            ✓ {insignia.texto}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function CajaPrecio({
  cargando,
  preview,
  precioUnitario,
  editando,
  onEditar,
  onFinEdicion,
  valorEditado,
  onCambio,
  tramoElegido,
  onCambiarTramo,
  precioGuardado = false,
}: {
  cargando: boolean;
  preview: PrevisualizacionPrecio;
  precioUnitario: number;
  editando: boolean;
  onEditar: () => void;
  onFinEdicion: () => void;
  valorEditado: string | null;
  onCambio: (v: string) => void;
  // true si el tramo se eligio a mano (no es el que corresponde a la cantidad)
  tramoElegido: boolean;
  onCambiarTramo: () => void;
  // Editando sin tocar cliente/cantidad/tramo: se muestra el precio con el
  // que se guardo la venta, no el de la lista de hoy.
  precioGuardado?: boolean;
}) {
  if (cargando) {
    return (
      <div className="rounded-xl bg-navy/10 px-4 py-3 text-sm font-semibold">
        Calculando precio...
      </div>
    );
  }
  if (!preview) {
    return (
      <div className="rounded-xl border-2 border-rosa bg-rosa/10 px-4 py-3 text-sm font-semibold text-rosa">
        No se pudo calcular un precio (¿hay una lista de precios activa?).
      </div>
    );
  }

  const modoPrecio = preview.editable ? "EDITABLE" : "FIJO";
  const etiqueta = precioGuardado
    ? `PRECIO DE LA VENTA — ${modoPrecio}`
    : preview.origen === "PVP"
      ? `PVP MINORISTA — ${modoPrecio}`
      : preview.origen === "PARTICULAR"
        ? `PRECIO PARTICULAR — ${modoPrecio}`
        : `TRAMO ${preview.tramoDesde} UN.${preview.tipo === "DISTRIBUIDOR" ? " −20%" : ""}${tramoElegido ? " · ELEGIDO" : ""} — ${modoPrecio}`;

  return (
    <div
      className={`rounded-xl px-4 py-3 ${preview.origen === "PVP" ? "bg-amarillo/25" : "bg-navy/15"}`}
    >
      <div className="text-[10px] font-extrabold uppercase tracking-wide text-navy/60">
        {etiqueta}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        {preview.editable && editando ? (
          <span className="flex items-baseline">
            <span className="text-2xl font-black">$</span>
            <input
              autoFocus
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              aria-label="Precio unitario"
              value={valorEditado ?? String(precioUnitario)}
              onChange={(e) => onCambio(e.target.value)}
              onBlur={onFinEdicion}
              className="w-32 bg-transparent text-2xl font-black outline-none border-b-2 border-navy"
            />
          </span>
        ) : preview.editable ? (
          <button
            type="button"
            onClick={onEditar}
            aria-label="Editar precio unitario"
            className="text-2xl font-black border-b-2 border-dashed border-navy/40 hover:border-navy"
          >
            {formatMoney(precioUnitario)}
          </button>
        ) : (
          <span className="text-2xl font-black">{formatMoney(precioUnitario)}</span>
        )}
        <span className="text-sm font-semibold text-navy/55">c/u</span>
      </div>
      {preview.origen === "TRAMO" && preview.tramos.length > 1 && (
        <button
          type="button"
          onClick={onCambiarTramo}
          className="mt-2.5 text-xs font-extrabold underline decoration-2"
        >
          {tramoElegido ? "Cambiar o restablecer tramo" : "Cambiar tramo"}
        </button>
      )}
    </div>
  );
}

function Navegacion({
  onAtras,
  siguienteDeshabilitado,
}: {
  onAtras: () => void;
  siguienteDeshabilitado: boolean;
}) {
  return (
    <div className="flex gap-2.5">
      <button type="button" onClick={onAtras} className="btn-secondary text-sm">
        ← Atrás
      </button>
      <button type="submit" disabled={siguienteDeshabilitado} className="btn-primary">
        Siguiente →
      </button>
    </div>
  );
}

function FilaResumen({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-xs text-navy/55">{label}</dt>
      <dd className="font-extrabold text-right">{value}</dd>
    </div>
  );
}

function IconoRayo() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
    </svg>
  );
}

function IconoLocal() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 10v10h16V10" />
      <path d="M3 10 5 4h14l2 6c0 1.7-1.3 3-3 3s-3-1.3-3-3c0 1.7-1.3 3-3 3s-3-1.3-3-3c0 1.7-1.3 3-3 3s-3-1.3-3-3Z" />
    </svg>
  );
}
