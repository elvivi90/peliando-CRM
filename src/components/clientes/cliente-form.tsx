"use client";

import { useState, useTransition } from "react";
import { crearCliente, actualizarCliente } from "@/app/(app)/clientes/actions";

type Lista = { id: string; nombre: string; estado: string };

type ClienteFormValues = {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  direccion: string;
  tipo: "MINORISTA" | "MAYORISTA" | "DISTRIBUIDOR" | "CONCESION";
  precioParticular: string;
  listaPrecioId: string;
};

const TIPOS = [
  { value: "MINORISTA", label: "Minorista" },
  { value: "MAYORISTA", label: "Mayorista" },
  { value: "DISTRIBUIDOR", label: "Distribuidor" },
  { value: "CONCESION", label: "Concesión" },
] as const;

export function ClienteForm({
  listas,
  clienteId,
  defaultValues,
}: {
  listas: Lista[];
  clienteId?: string;
  defaultValues?: Partial<ClienteFormValues>;
}) {
  const [values, setValues] = useState<ClienteFormValues>({
    nombre: defaultValues?.nombre ?? "",
    apellido: defaultValues?.apellido ?? "",
    email: defaultValues?.email ?? "",
    telefono: defaultValues?.telefono ?? "",
    direccion: defaultValues?.direccion ?? "",
    tipo: defaultValues?.tipo ?? "MINORISTA",
    precioParticular: defaultValues?.precioParticular ?? "",
    listaPrecioId: defaultValues?.listaPrecioId ?? "",
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

  const mostrarListaPrecio = values.tipo === "MAYORISTA" || values.tipo === "DISTRIBUIDOR";
  const mostrarPrecioParticular = values.tipo === "MAYORISTA";

  return (
    <form onSubmit={handleSubmit} className="card-chunky p-6 flex flex-col gap-4 max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nombre" required>
          <input
            className="input-chunky"
            value={values.nombre}
            onChange={(e) => update("nombre", e.target.value)}
            required
          />
        </Field>
        <Field label="Apellido" required>
          <input
            className="input-chunky"
            value={values.apellido}
            onChange={(e) => update("apellido", e.target.value)}
            required
          />
        </Field>
      </div>

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

      {mostrarListaPrecio && (
        <Field label="Lista de precios" hint="Si no se define, se usa la lista activa por defecto">
          <select
            className="input-chunky"
            value={values.listaPrecioId}
            onChange={(e) => update("listaPrecioId", e.target.value)}
          >
            <option value="">Usar lista activa por defecto</option>
            {listas.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nombre} {l.estado === "HISTORICA" ? "(histórica)" : ""}
              </option>
            ))}
          </select>
        </Field>
      )}

      {mostrarPrecioParticular && (
        <Field
          label="Precio particular"
          hint="Solo para mayoristas con acuerdo propio que no sigue la lista de precios"
        >
          <input
            type="number"
            step="0.01"
            min="0"
            className="input-chunky"
            value={values.precioParticular}
            onChange={(e) => update("precioParticular", e.target.value)}
            placeholder="$"
          />
        </Field>
      )}

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
