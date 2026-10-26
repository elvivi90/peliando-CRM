"use client";

import { PROVINCIAS } from "@/lib/provincias";

// Mismos nombres que el modelo Envio y envioSchema.
export type DatosEnvioForm = {
  destinatarioNombre: string;
  destinatarioEmail: string;
  destinatarioTelefono: string;
  calle: string;
  numeroCalle: string;
  piso: string;
  departamento: string;
  barrio: string;
  localidad: string;
  provincia: string;
  codigoPostal: string;
};

export const ENVIO_VACIO: DatosEnvioForm = {
  destinatarioNombre: "",
  destinatarioEmail: "",
  destinatarioTelefono: "",
  calle: "",
  numeroCalle: "",
  piso: "",
  departamento: "",
  barrio: "",
  localidad: "",
  provincia: "B",
  codigoPostal: "",
};

// Lo minimo que pide Correo para un envio a domicilio.
export function envioCompleto(d: DatosEnvioForm) {
  return Boolean(
    d.destinatarioNombre.trim() &&
      /^\S+@\S+\.\S+$/.test(d.destinatarioEmail.trim()) &&
      d.calle.trim() &&
      d.numeroCalle.trim() &&
      d.localidad.trim() &&
      d.provincia &&
      d.codigoPostal.trim(),
  );
}

/** Destinatario y direccion de un envio por Correo Argentino. */
export function CamposEnvio({
  datos,
  onChange,
}: {
  datos: DatosEnvioForm;
  onChange: (d: DatosEnvioForm) => void;
}) {
  function campo(k: keyof DatosEnvioForm) {
    return {
      value: datos[k],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        onChange({ ...datos, [k]: e.target.value }),
    };
  }

  return (
    <div className="grid grid-cols-6 gap-2.5">
      <Etiqueta texto="Destinatario" requerido className="col-span-6">
        <input className="input-chunky" autoComplete="off" {...campo("destinatarioNombre")} />
      </Etiqueta>
      <Etiqueta texto="Email" requerido className="col-span-6 sm:col-span-4">
        <input type="email" className="input-chunky" autoComplete="off" {...campo("destinatarioEmail")} />
      </Etiqueta>
      <Etiqueta texto="Teléfono" className="col-span-6 sm:col-span-2">
        <input type="tel" className="input-chunky" autoComplete="off" {...campo("destinatarioTelefono")} />
      </Etiqueta>
      <Etiqueta texto="Calle" requerido className="col-span-4">
        <input className="input-chunky" autoComplete="off" {...campo("calle")} />
      </Etiqueta>
      <Etiqueta texto="Número" requerido className="col-span-2">
        <input className="input-chunky" inputMode="numeric" autoComplete="off" {...campo("numeroCalle")} />
      </Etiqueta>
      <Etiqueta texto="Piso" className="col-span-3">
        <input className="input-chunky" maxLength={3} autoComplete="off" {...campo("piso")} />
      </Etiqueta>
      <Etiqueta texto="Depto" className="col-span-3">
        <input className="input-chunky" maxLength={3} autoComplete="off" {...campo("departamento")} />
      </Etiqueta>
      <Etiqueta texto="Barrio / referencia" className="col-span-6">
        <input className="input-chunky" autoComplete="off" {...campo("barrio")} />
      </Etiqueta>
      <Etiqueta texto="Localidad" requerido className="col-span-6 sm:col-span-4">
        <input className="input-chunky" autoComplete="off" {...campo("localidad")} />
      </Etiqueta>
      <Etiqueta texto="CP" requerido className="col-span-6 sm:col-span-2">
        <input className="input-chunky" autoComplete="off" {...campo("codigoPostal")} />
      </Etiqueta>
      <Etiqueta texto="Provincia" requerido className="col-span-6">
        <select className="input-chunky" {...campo("provincia")}>
          {PROVINCIAS.map((p) => (
            <option key={p.codigo} value={p.codigo}>
              {p.nombre}
            </option>
          ))}
        </select>
      </Etiqueta>
    </div>
  );
}

function Etiqueta({
  texto,
  requerido,
  className,
  children,
}: {
  texto: string;
  requerido?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1 min-w-0 ${className ?? ""}`}>
      <span className="text-[11px] font-extrabold uppercase tracking-wide text-navy/60">
        {texto}
        {requerido && <span className="text-rosa"> *</span>}
      </span>
      {children}
    </label>
  );
}
