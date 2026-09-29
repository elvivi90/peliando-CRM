"use client";

import { useState, useTransition } from "react";
import { crearCliente, actualizarCliente } from "@/app/(app)/clientes/actions";

type ClienteFormValues = {
  nombreNegocio: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  direccion: string;
  tipo: "MINORISTA" | "MAYORISTA" | "DISTRIBUIDOR";
};

const TIPOS = [
  { value: "MINORISTA", label: "Minorista" },
  { value: "MAYORISTA", label: "Mayorista" },
  { value: "DISTRIBUIDOR", label: "Distribuidor" },
] as const;

export function ClienteForm({
  clienteId,
  defaultValues,
}: {
  clienteId?: string;
  defaultValues?: Partial<ClienteFormValues>;
}) {
  const [values, setValues] = useState<ClienteFormValues>({
    nombreNegocio: defaultValues?.nombreNegocio ?? "",
    nombre: defaultValues?.nombre ?? "",
    apellido: defaultValues?.apellido ?? "",
    email: defaultValues?.email ?? "",
    telefono: defaultValues?.telefono ?? "",
    direccion: defaultValues?.direccion ?? "",
    tipo: defaultValues?.tipo ?? "MINORISTA",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function update<K extends keyof ClienteFormValues>(key: K, value: ClienteFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        if (clienteId) {
          await actualizarCliente(clienteId, values);
        } else {
          await crearCliente(values);
        }
      } catch (err) {
        const digest = (err as { digest?: string })?.digest;
        if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) {
          throw err;
        }
        setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
      }
    });
  }

  const esNegocio = values.tipo === "MAYORISTA" || values.tipo === "DISTRIBUIDOR";

  return (
    <form onSubmit={handleSubmit} className="card-chunky p-6 flex flex-col gap-4 max-w-2xl">
      <Field label="Tipo de cliente" required>
        <select
          className="input-chunky"
          value={values.tipo}
          onChange={(e) => update("tipo", e.target.value as ClienteFormValues["tipo"])}
        >
          {TIPOS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>

      {esNegocio && (
        <Field label="Nombre del negocio" required>
          <input
            className="input-chunky"
            value={values.nombreNegocio}
            onChange={(e) => update("nombreNegocio", e.target.value)}
            placeholder="Librería El Ateneo"
            required
          />
        </Field>
      )}

      {esNegocio && (
        <div className="text-xs font-black uppercase tracking-wide text-navy/55 -mb-1 mt-1">
          Contacto (opcional)
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nombre" required={!esNegocio}>
          <input
            className="input-chunky"
            value={values.nombre}
            onChange={(e) => update("nombre", e.target.value)}
            required={!esNegocio}
          />
        </Field>
        <Field label="Apellido" required={!esNegocio}>
          <input
            className="input-chunky"
            value={values.apellido}
            onChange={(e) => update("apellido", e.target.value)}
            required={!esNegocio}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Email">
          <input
            type="email"
            className="input-chunky"
            value={values.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </Field>
        <Field label="Teléfono">
          <input
            className="input-chunky"
            value={values.telefono}
            onChange={(e) => update("telefono", e.target.value)}
          />
        </Field>
      </div>

      <Field label="Dirección">
        <input
          className="input-chunky"
          value={values.direccion}
          onChange={(e) => update("direccion", e.target.value)}
        />
      </Field>

      {error && (
        <p className="text-sm font-bold text-rosa" role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-3 mt-2">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Guardando..." : clienteId ? "Guardar cambios" : "Crear cliente"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-extrabold uppercase tracking-wide text-navy/70">
        {label}
        {required && <span className="text-rosa"> *</span>}
      </span>
      {children}
      {hint && <span className="text-xs text-navy/50">{hint}</span>}
    </label>
  );
}
