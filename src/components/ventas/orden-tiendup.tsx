import { fetchTiendupOrder, type TiendupAddress, type TiendupOrder } from "@/lib/services/tiendup";
import { formatMoney } from "@/lib/format";
import { parseFechaHoraArgentina } from "@/lib/date";

// Valores relevados de ordenes reales; lo que no este aca se muestra tal cual.
const ESTADO_ORDEN: Record<string, string> = { open: "Abierta", closed: "Cerrada" };
const ESTADO_PAGO: Record<string, string> = { paid: "Pagado" };
const ESTADO_ENVIO: Record<string, string> = { shipped: "Enviado", unshipped: "Sin enviar" };

const fechaHora = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Argentina/Buenos_Aires",
});

function direccion(a: TiendupAddress | null | undefined) {
  if (!a) return null;
  const calle = [a.street, a.number].filter(Boolean).join(" ");
  const piso = a.floor ? `piso ${a.floor}` : null;
  const localidad = [a.zip_code, a.city].filter(Boolean).join(" ");
  const partes = [calle, piso, localidad, a.state].filter(Boolean);
  return partes.length > 0 ? partes.join(", ") : null;
}

/**
 * Detalle de la orden de Tiendup de una venta automatica, consultado en vivo
 * (ver lib/services/tiendup.ts). Va dentro de un <Suspense>: si Tiendup
 * tarda o falla, el resto del detalle de la venta se muestra igual.
 */
export async function OrdenTiendup({ orderId }: { orderId: number }) {
  let orden: TiendupOrder;
  try {
    orden = await fetchTiendupOrder(orderId, { timeoutMs: 8000 });
  } catch (err) {
    console.error(`[tiendup] detalle de la orden #${orderId}:`, err);
    return (
      <Tarjeta titulo={`Orden de Tiendup #${orderId}`}>
        <p className="text-sm text-navy/60">
          No se pudo consultar la orden en Tiendup. Probá recargar en un rato.
        </p>
      </Tarjeta>
    );
  }

  const envio = orden.shipping;
  const costoEnvio = Number(envio?.cost_customer ?? 0);
  const descuento = Number(orden.discount ?? 0);
  const cliente = [orden.customer.name, orden.customer.last_name].filter(Boolean).join(" ");
  const tieneEnvio = envio && envio.type !== "none";
  const pagado = orden.payment_confirmation_date
    ? fechaHora.format(parseFechaHoraArgentina(orden.payment_confirmation_date))
    : null;

  return (
    <Tarjeta
      titulo={`Orden de Tiendup #${orden.number ?? orden.id}`}
      estado={orden.status ? (ESTADO_ORDEN[orden.status] ?? orden.status) : undefined}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
        <Seccion titulo="Cliente">
          <Dato valor={cliente || "—"} fuerte />
          <Dato valor={orden.customer.email} />
          {orden.customer.phone && <Dato valor={orden.customer.phone} />}
        </Seccion>

        <Seccion titulo="Pago">
          <Dato
            valor={[
              orden.gateway?.name,
              orden.payment_status ? (ESTADO_PAGO[orden.payment_status] ?? orden.payment_status) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
            fuerte
          />
          {pagado && <Dato valor={`Confirmado el ${pagado}`} />}
        </Seccion>

        {tieneEnvio && (
          <Seccion titulo={envio.type_display_name || "Envío"}>
            <Dato
              valor={[
                envio.name?.trim(),
                envio.status ? (ESTADO_ENVIO[envio.status] ?? envio.status) : null,
              ]
                .filter(Boolean)
                .join(" · ") || "—"}
              fuerte
            />
            {envio.tracking_code && <Dato valor={`Seguimiento: ${envio.tracking_code}`} />}
            {envio.type !== "branch_pickup" && (
              <>
                {envio.recipient_name && (
                  <Dato
                    valor={`Recibe: ${envio.recipient_name}${envio.recipient_phone ? ` · ${envio.recipient_phone}` : ""}`}
                  />
                )}
                {direccion(envio.address) && <Dato valor={direccion(envio.address)!} />}
              </>
            )}
            {(envio.observations || envio.address?.observations) && (
              <Dato valor={`Obs.: ${envio.observations || envio.address?.observations}`} />
            )}
          </Seccion>
        )}

        <Seccion titulo="Productos">
          {orden.items.map((item, i) => (
            <div key={i} className="flex justify-between gap-3 text-sm">
              <span className="font-semibold">
                {item.quantity ?? 1} × {item.name ?? "Producto"}
              </span>
              <span className="whitespace-nowrap">{formatMoney(item.unit_price ?? item.price)}</span>
            </div>
          ))}
          {costoEnvio > 0 && <Linea label="Envío" valor={formatMoney(costoEnvio)} />}
          {descuento > 0 && (
            <Linea
              label={`Descuento${orden.promo_code ? ` (${orden.promo_code})` : ""}`}
              valor={`− ${formatMoney(descuento)}`}
            />
          )}
          <div className="flex justify-between gap-3 text-sm border-t border-navy/10 pt-1.5 mt-0.5">
            <span className="font-extrabold">Total</span>
            <span className="font-extrabold whitespace-nowrap">{formatMoney(orden.total_amount)}</span>
          </div>
        </Seccion>
      </div>

      {orden.note && (
        <div className="mt-5">
          <Seccion titulo="Nota del cliente">
            <Dato valor={orden.note} />
          </Seccion>
        </div>
      )}
    </Tarjeta>
  );
}

export function OrdenTiendupCargando({ orderId }: { orderId: number }) {
  return (
    <Tarjeta titulo={`Orden de Tiendup #${orderId}`}>
      <p className="text-sm text-navy/50">Consultando la orden en Tiendup...</p>
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
        {estado && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-navy/10 text-navy">
            {estado}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs font-bold text-navy/50 uppercase">{titulo}</div>
      {children}
    </div>
  );
}

function Dato({ valor, fuerte }: { valor: string; fuerte?: boolean }) {
  return <div className={`text-sm break-words ${fuerte ? "font-semibold" : "text-navy/70"}`}>{valor}</div>;
}

function Linea({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm text-navy/70">
      <span>{label}</span>
      <span className="whitespace-nowrap">{valor}</span>
    </div>
  );
}
