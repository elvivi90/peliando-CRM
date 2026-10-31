import { EnvioBadge } from "@/components/ui/badge";
import { EnvioPanel, type EnvioDetalle } from "@/components/ventas/envio-panel";
import { ordenTiendupDeVenta } from "@/components/ventas/orden-tiendup";
import type { TiendupAddress } from "@/lib/services/tiendup";

// Estado del envio en Tiendup (valores relevados de ordenes reales) como el
// de EnvioBadge; lo que no este aca se muestra tal cual.
const ESTADO_ENVIO: Record<string, string> = { shipped: "ENVIADO", unshipped: "POR_ENVIAR" };

function direccion(a: TiendupAddress | null | undefined) {
  if (!a) return null;
  const calle = [a.street, a.number].filter(Boolean).join(" ");
  const piso = a.floor ? `piso ${a.floor}` : null;
  const localidad = [a.zip_code, a.city].filter(Boolean).join(" ");
  const partes = [calle, piso, a.intersections, localidad, a.state].filter(Boolean);
  return partes.length > 0 ? partes.join(" · ") : null;
}

/**
 * Bloque de envio de una venta. Si tiene Envio por Correo, lo muestra con el
 * seguimiento y la nota de la orden de Tiendup; si es de Tiendup sin Envio
 * (retiro en sucursal, o una venta anterior a la integracion con Correo),
 * muestra el envio tal como lo informa Tiendup. Tiendup se consulta en vivo
 * (el seguimiento lo carga el equipo despues del pago): va dentro de un
 * <Suspense> y, si Tiendup falla, se muestra lo que tiene el CRM.
 */
export async function EnvioVenta({
  tiendupOrderId,
  envio,
  nombreCliente,
}: {
  tiendupOrderId: number | null;
  envio: EnvioDetalle | null;
  nombreCliente: string | null;
}) {
  const orden = tiendupOrderId !== null ? await ordenTiendupDeVenta(tiendupOrderId) : null;
  const nota = orden?.note?.trim() || orden?.shipping?.observations?.trim() || null;

  if (envio) {
    return (
      <EnvioPanel
        envio={envio}
        trackingTiendup={orden?.shipping?.tracking_code}
        nombreCliente={nombreCliente}
        nota={nota}
      />
    );
  }

  const e = orden?.shipping;
  if (!e || !e.type || e.type === "none") {
    if (tiendupOrderId !== null && !orden) {
      return (
        <Tarjeta titulo="Envío">
          <p className="text-sm text-navy/60">
            No se pudo consultar el envío en Tiendup. Probá recargar en un rato.
          </p>
        </Tarjeta>
      );
    }
    return null;
  }

  const retiro = e.type === "branch_pickup";
  const recibe =
    e.recipient_name && e.recipient_name.trim().toLowerCase() !== nombreCliente?.trim().toLowerCase()
      ? e.recipient_name
      : null;

  return (
    <Tarjeta
      titulo={`Envío · ${e.type_display_name || (retiro ? "Retira en sucursal" : "Envío")}`}
      estado={e.status ? (ESTADO_ENVIO[e.status] ?? e.status) : undefined}
    >
      <div className="grid grid-cols-2 gap-4 text-sm">
        {e.name?.trim() && (
          <div className="col-span-2">
            <Dato label={retiro ? "Sucursal" : "Método"} value={e.name.trim()} />
          </div>
        )}
        {!retiro && direccion(e.address) && (
          <div className="col-span-2">
            <Dato label="Dirección" value={direccion(e.address)!} />
          </div>
        )}
        {!retiro && recibe && (
          <div className="col-span-2">
            <Dato label="Recibe" value={recibe} />
          </div>
        )}
        {!retiro && <Dato label="Seguimiento" value={e.tracking_code || "Todavía sin número"} />}
        {nota && (
          <div className="col-span-2">
            <Dato label="Nota del cliente" value={nota} />
          </div>
        )}
      </div>
    </Tarjeta>
  );
}

export function EnvioVentaCargando({ envio }: { envio: EnvioDetalle | null }) {
  if (envio) return <EnvioPanel envio={envio} />;
  return (
    <Tarjeta titulo="Envío">
      <p className="text-sm text-navy/50">Consultando el envío en Tiendup...</p>
    </Tarjeta>
  );
}

function Tarjeta({
  titulo,
  estado,
  children,
}: {
  titulo: string;
  estado?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card-chunky p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="font-extrabold text-sm uppercase tracking-wide text-navy/60">{titulo}</h2>
        {estado && <EnvioBadge estado={estado} />}
      </div>
      {children}
    </div>
  );
}

function Dato({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-bold text-navy/50 uppercase">{label}</div>
      <div className="font-semibold break-words">{value}</div>
    </div>
  );
}
