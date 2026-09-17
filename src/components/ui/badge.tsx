const TIPO_COLOR: Record<string, string> = {
  MINORISTA: "bg-azul/15 text-azul",
  MAYORISTA: "bg-amarillo/25 text-navy",
  DISTRIBUIDOR: "bg-rosa/15 text-rosa",
  CONCESION: "bg-navy/10 text-navy",
};

const TIPO_LABEL: Record<string, string> = {
  MINORISTA: "Minorista",
  MAYORISTA: "Mayorista",
  DISTRIBUIDOR: "Distribuidor",
  CONCESION: "Concesión",
};

export function TipoBadge({ tipo }: { tipo: string }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold ${TIPO_COLOR[tipo] ?? "bg-navy/10 text-navy"}`}
    >
      {TIPO_LABEL[tipo] ?? tipo}
    </span>
  );
}

export function EstadoBadge({ estado }: { estado: string }) {
  const activa = estado === "ACTIVA";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold border-2 ${
        activa ? "bg-amarillo border-navy text-navy" : "border-navy/30 text-navy/50"
      }`}
    >
      {activa ? "Activa" : "Histórica"}
    </span>
  );
}
