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

// Estado de un envio por Correo Argentino: amarillo mientras viaja, verde
// entregado, rojo si fallo el alta.
const ENVIO_ESTILO: Record<string, { color: string; label: string }> = {
  POR_ENVIAR: { color: "bg-amarillo/30 text-navy", label: "Por enviar" },
  ENVIADO: { color: "bg-amarillo text-navy", label: "Enviado" },
  ENTREGADO: { color: "bg-emerald-600/15 text-emerald-800", label: "Entregado" },
  ERROR_CREACION: { color: "bg-red-600/15 text-red-700", label: "Error" },
};

export function EnvioBadge({ estado }: { estado: string }) {
  const estilo = ENVIO_ESTILO[estado] ?? { color: "bg-navy/10 text-navy", label: estado };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold whitespace-nowrap ${estilo.color}`}
    >
      {estilo.label}
    </span>
  );
}

export function TipoGastoBadge({ tipo }: { tipo: string }) {
  const inversion = tipo === "INVERSION";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wide ${
        inversion ? "bg-rosa text-white" : "bg-amarillo text-navy"
      }`}
    >
      {inversion ? "Inversión" : "Operativo"}
    </span>
  );
}
