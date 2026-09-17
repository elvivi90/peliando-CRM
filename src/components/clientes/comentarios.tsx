"use client";

import { useRef, useState, useTransition } from "react";
import { agregarComentario } from "@/app/(app)/clientes/actions";
import { formatDate } from "@/lib/format";

type Comentario = {
  id: string;
  texto: string;
  fecha: Date | string;
  usuario: { nombre: string };
};

export function Comentarios({
  clienteId,
  comentarios,
}: {
  clienteId: string;
  comentarios: Comentario[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const texto = new FormData(e.currentTarget).get("texto") as string;
    setError(null);
    startTransition(async () => {
      try {
        await agregarComentario(clienteId, texto);
        formRef.current?.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo guardar el comentario.");
      }
    });
  }

  return (
    <div className="card-chunky p-5 flex flex-col gap-4">
      <h2 className="font-extrabold text-sm uppercase tracking-wide text-navy/60">
        Comentarios
      </h2>

      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          name="texto"
          required
          rows={2}
          placeholder="Dejar constancia de un encuentro, acuerdo verbal, etc."
          className="input-chunky resize-none"
        />
        {error && <p className="text-sm font-bold text-rosa">{error}</p>}
        <button type="submit" disabled={pending} className="btn-secondary text-sm self-start">
          {pending ? "Guardando..." : "Agregar comentario"}
        </button>
      </form>

      {comentarios.length === 0 ? (
        <p className="text-sm text-navy/50">Todavía no hay comentarios.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comentarios.map((c) => (
            <li key={c.id} className="border-t-2 border-navy/10 pt-3 first:border-0 first:pt-0">
              <p className="text-sm">{c.texto}</p>
              <p className="text-xs text-navy/50 mt-1 font-semibold">
                {c.usuario.nombre} · {formatDate(c.fecha)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
