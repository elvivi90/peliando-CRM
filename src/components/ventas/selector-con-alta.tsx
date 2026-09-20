"use client";

import { useEffect, useRef, useState } from "react";

type Opcion = { id: string; label: string };

// Campo desplegable con una fila "+ Crear ... nuevo" al final, dentro del
// mismo campo (asi el alta rapida no obliga a salir de la pantalla).
export function SelectorConAlta({
  value,
  opciones,
  onChange,
  placeholder,
  buscador = false,
  vacioLabel,
  crearLabel,
  onCrear,
  tono,
}: {
  value: string;
  opciones: Opcion[];
  onChange: (id: string) => void;
  placeholder: string;
  buscador?: boolean;
  // Si se pasa, agrega una opcion "sin seleccion" (id "") al principio.
  vacioLabel?: string;
  crearLabel: string;
  onCrear: () => void;
  tono: "amarillo" | "rosa";
}) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    function onMouseDown(e: MouseEvent) {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) setAbierto(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [abierto]);

  const seleccionada = opciones.find((o) => o.id === value);
  const filtradas = busqueda.trim()
    ? opciones.filter((o) => o.label.toLowerCase().includes(busqueda.trim().toLowerCase()))
    : opciones;

  function elegir(id: string) {
    onChange(id);
    setAbierto(false);
    setBusqueda("");
  }

  const filaCrear =
    tono === "rosa" ? "bg-rosa/15 hover:bg-rosa/25" : "bg-amarillo/25 hover:bg-amarillo/40";

  if (!abierto) {
    return (
      <div ref={contenedor}>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={false}
          onClick={() => setAbierto(true)}
          className="input-chunky w-full flex items-center justify-between gap-2 text-left"
        >
          <span className={seleccionada || (vacioLabel && !value) ? "" : "text-navy/50"}>
            {seleccionada?.label ?? (vacioLabel && !value ? vacioLabel : placeholder)}
          </span>
          <span aria-hidden className="text-navy/50 text-xs">
            ▾
          </span>
        </button>
      </div>
    );
  }

  return (
    <div ref={contenedor} className="input-chunky p-0 overflow-hidden">
      {buscador && (
        <input
          autoFocus
          type="text"
          placeholder={placeholder}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full bg-transparent px-3.5 py-2.5 font-semibold outline-none border-b-2 border-navy/15"
        />
      )}
      <ul role="listbox" className="max-h-52 overflow-y-auto">
        {vacioLabel && (
          <li role="option" aria-selected={!value}>
            <button
              type="button"
              onClick={() => elegir("")}
              className="w-full text-left px-3.5 py-2 text-sm hover:bg-navy/5"
            >
              {vacioLabel}
            </button>
          </li>
        )}
        {filtradas.map((o) => (
          <li key={o.id} role="option" aria-selected={o.id === value}>
            <button
              type="button"
              onClick={() => elegir(o.id)}
              className={`w-full text-left px-3.5 py-2 text-sm hover:bg-navy/5 ${o.id === value ? "font-black" : ""}`}
            >
              {o.label}
            </button>
          </li>
        ))}
        {filtradas.length === 0 && !vacioLabel && (
          <li className="px-3.5 py-2 text-sm text-navy/50">Sin resultados</li>
        )}
      </ul>
      <button
        type="button"
        onClick={() => {
          setAbierto(false);
          setBusqueda("");
          onCrear();
        }}
        className={`w-full text-left px-3.5 py-2.5 text-sm font-extrabold border-t-2 border-navy/15 ${filaCrear}`}
      >
        + {crearLabel}
      </button>
    </div>
  );
}
