"use client";

import { useState, useTransition } from "react";
import { reintentarEnvio } from "@/app/(app)/ventas/actions";
import { EnvioBadge } from "@/components/ui/badge";
import { CamposEnvio, envioCompleto, type DatosEnvioForm } from "@/components/ventas/campos-envio";
import { formatMoney } from "@/lib/format";
import { nombreProvincia } from "@/lib/provincias";

export type EnvioDetalle = DatosEnvioForm & {
  id: string;
  numero: number;
  estado: string;
  trackingNumber: string | null;
  costoEnvioReal: number | null;
  errorMensaje: string | null;
  ultimoEvento: string | null;
};

/**
 * Envio por Correo Argentino de una venta. Si el alta fallo muestra el
 * motivo y la direccion editable para reintentar.
 */
export function EnvioPanel({ envio }: { envio: EnvioDetalle }) {
  const [datos, setDatos] = useState<DatosEnvioForm>(envio);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const conError = envio.estado === "ERROR_CREACION";

  function reintentar() {
    setError(null);
    startTransition(async () => {
      try {
        await reintentarEnvio(envio.id, datos);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo dar de alta el envío.");
      }
    });
  }

  const direccion = [
    `${envio.calle} ${envio.numeroCalle}`,
    [envio.piso && `Piso ${envio.piso}`, envio.departamento && `Depto ${envio.departamento}`]
      .filter(Boolean)
      .join(" "),
    envio.barrio,
    `${envio.localidad}, ${nombreProvincia(envio.provincia)} (${envio.codigoPostal})`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="card-chunky p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-extrabold text-sm uppercase tracking-wide text-navy/60">
          Envío por Correo Argentino
        </h2>
        <EnvioBadge estado={envio.estado} />
      </div>

      {conError ? (
        <>
          <p className="rounded-xl border-2 border-red-600/40 bg-red-600/10 px-3.5 py-2.5 text-sm font-semibold text-red-700">
            {envio.errorMensaje ?? "Correo no dio de alta el envío."}
          </p>
          <p className="text-xs text-navy/60">
            Corregí lo que haga falta (o recargá saldo en Correo) y volvé a intentar. La venta ya
            está guardada.
          </p>
          <CamposEnvio datos={datos} onChange={setDatos} />
          {error && error !== envio.errorMensaje && (
            <p className="text-sm font-bold text-rosa" role="alert">
              {error}
            </p>
          )}
          <div>
            <button
              type="button"
              onClick={reintentar}
              disabled={pending || !envioCompleto(datos)}
              className="btn-primary text-sm"
            >
              {pending ? "Dando de alta..." : "Reintentar alta en Correo"}
            </button>
          </div>
        </>
      ) : (
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <Dato label="Seguimiento" value={envio.trackingNumber ?? "Todavía sin número"} />
          <Dato
            label="Costo real"
            value={envio.costoEnvioReal !== null ? formatMoney(envio.costoEnvioReal) : "—"}
          />
          <div className="col-span-2">
            <Dato label="Destinatario" value={envio.destinatarioNombre} />
          </div>
          <div className="col-span-2">
            <Dato label="Dirección" value={direccion} />
          </div>
          {envio.ultimoEvento && (
            <div className="col-span-2">
              <Dato label="Último movimiento" value={envio.ultimoEvento} />
            </div>
          )}
          <div className="col-span-2 text-xs text-navy/55">
            Pedido PEL{envio.numero} en MiCorreo: la etiqueta se imprime desde el portal de Correo.
          </div>
        </dl>
      )}
    </div>
  );
}

function Dato({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold text-navy/50 uppercase">{label}</dt>
      <dd className="font-semibold break-words">{value}</dd>
    </div>
  );
}
