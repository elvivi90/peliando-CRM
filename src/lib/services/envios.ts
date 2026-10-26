import { Prisma, type EstadoEnvio, type Envio } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  CorreoError,
  MAX_UNIDADES_POR_PAQUETE,
  consultarTracking,
  cotizarEnvio,
  importarEnvio,
  type Tracking,
} from "@/lib/services/correo-argentino";
import { fetchTiendupOrder, type TiendupOrder } from "@/lib/services/tiendup";
import { codigoProvincia } from "@/lib/provincias";

/**
 * Ciclo de un Envio (ver modelo en schema.prisma): se crea la fila junto con
 * la venta y despues se da de alta en Correo con crearEnvioEnCorreo, que
 * nunca tira: si Correo falla, el envio queda en ERROR_CREACION con el
 * mensaje y se reintenta desde el detalle de la venta. El cron diario
 * (/api/cron/envios-correo) sigue el estado con actualizarSeguimiento.
 */

// Identificador que se manda a Correo como extOrderId. Con prefijo para no
// chocar con pedidos que la cuenta de MiCorreo ya tenga importados por otra
// via (Correo rechaza un extOrderId repetido y eso se toma como exito).
export function idCorreo(envio: Pick<Envio, "numero">) {
  return `PEL${envio.numero}`;
}

/**
 * Numero de orden que se ve en el portal de MiCorreo: "tiendup#56" con el
 * numero de la orden de Tiendup, o "Manual#40" con el numero del envio (las
 * ventas no tienen numero propio). Es solo para mostrar: si Tiendup no
 * responde, va el extOrderId.
 */
async function numeroOrdenCorreo(
  envio: Pick<Envio, "numero">,
  venta: { tiendupOrderId: number | null },
) {
  if (venta.tiendupOrderId === null) return `Manual#${envio.numero}`;
  try {
    const order = await fetchTiendupOrder(venta.tiendupOrderId, { timeoutMs: 5000 });
    return order.number ? `tiendup#${order.number}` : idCorreo(envio);
  } catch {
    return idCorreo(envio);
  }
}

export type DatosEnvio = Pick<
  Envio,
  | "destinatarioNombre"
  | "destinatarioEmail"
  | "destinatarioTelefono"
  | "calle"
  | "numeroCalle"
  | "piso"
  | "departamento"
  | "barrio"
  | "localidad"
  | "provincia"
  | "codigoPostal"
>;

/**
 * Destinatario y direccion de una orden de Tiendup con envio a domicilio.
 * Null si la orden no lleva envio (retiro en sucursal o sin envio). Lo que
 * falte queda vacio y crearEnvioEnCorreo lo informa como error, para
 * completarlo a mano desde el detalle de la venta.
 */
export function datosEnvioTiendup(order: TiendupOrder): DatosEnvio | null {
  const envio = order.shipping;
  if (envio?.type !== "ship") return null;
  const a = envio.address ?? {};
  const nombreCliente = [order.customer.name, order.customer.last_name].filter(Boolean).join(" ");
  return {
    // Tiendup a veces trae espacios de mas ("Gabriela  Pons").
    destinatarioNombre: (envio.recipient_name?.trim() || nombreCliente || order.customer.email)
      .replace(/\s+/g, " ")
      .trim(),
    destinatarioEmail: order.customer.email,
    destinatarioTelefono: envio.recipient_phone?.trim() || order.customer.phone?.trim() || null,
    calle: a.street?.trim() ?? "",
    numeroCalle: a.number?.trim() ?? "",
    piso: a.floor?.trim() || null,
    departamento: null,
    barrio: a.intersections?.trim() || null,
    localidad: a.city?.trim() ?? "",
    provincia: codigoProvincia(a.state) ?? "",
    codigoPostal: a.zip_code?.replace(/\s/g, "") ?? "",
  };
}

function faltantes(e: DatosEnvio) {
  const campos: [keyof DatosEnvio, string][] = [
    ["destinatarioNombre", "nombre del destinatario"],
    ["destinatarioEmail", "email del destinatario"],
    ["calle", "calle"],
    ["numeroCalle", "número"],
    ["localidad", "localidad"],
    ["provincia", "provincia"],
    ["codigoPostal", "código postal"],
  ];
  return campos.filter(([k]) => !e[k]?.toString().trim()).map(([, label]) => label);
}

/**
 * Cotiza e importa el envio en Correo. Al tener exito guarda el costo real,
 * que tambien pisa Venta.costoEnvio (asi Reportes y Eventos cuentan el gasto
 * real) y descuenta del saldo estimado. Seguro de llamar dos veces: Correo
 * no importa dos veces el mismo extOrderId (Envio.numero).
 */
export async function crearEnvioEnCorreo(envioId: string) {
  const envio = await prisma.envio.findUniqueOrThrow({
    where: { id: envioId },
    include: { venta: true },
  });
  if (envio.estado !== "ERROR_CREACION" && envio.costoEnvioReal !== null) return envio;

  try {
    const falta = faltantes(envio);
    if (falta.length > 0) throw new CorreoError(`Falta completar: ${falta.join(", ")}.`);
    if (envio.venta.cantidad > MAX_UNIDADES_POR_PAQUETE) {
      throw new CorreoError(
        `Más de ${MAX_UNIDADES_POR_PAQUETE} unidades no entran en un solo paquete: hay que despacharlo a mano.`,
      );
    }

    const costo = await cotizarEnvio(envio.codigoPostal, envio.venta.cantidad);
    await importarEnvio({
      extOrderId: idCorreo(envio),
      orderNumber: await numeroOrdenCorreo(envio, envio.venta),
      cantidad: envio.venta.cantidad,
      destino: {
        nombre: envio.destinatarioNombre,
        email: envio.destinatarioEmail,
        telefono: envio.destinatarioTelefono,
        calle: envio.calle,
        numero: envio.numeroCalle,
        piso: envio.piso,
        departamento: envio.departamento,
        barrio: envio.barrio,
        ciudad: envio.localidad,
        provincia: envio.provincia,
        codigoPostal: envio.codigoPostal,
      },
    });

    const [actualizado] = await prisma.$transaction([
      prisma.envio.update({
        where: { id: envio.id },
        data: {
          estado: "POR_ENVIAR",
          costoEnvioReal: costo,
          errorMensaje: null,
        },
      }),
      prisma.venta.update({
        where: { id: envio.ventaId },
        data: { costoEnvio: costo },
      }),
    ]);
    return actualizado;
  } catch (err) {
    const mensaje =
      err instanceof CorreoError
        ? err.message
        : `No se pudo conectar con Correo Argentino (${err instanceof Error ? err.message : "error desconocido"}).`;
    if (!(err instanceof CorreoError))
      console.error(`[correo] alta del envio ${envio.numero}:`, err);
    return prisma.envio.update({
      where: { id: envio.id },
      data: { estado: "ERROR_CREACION", errorMensaje: mensaje },
    });
  }
}

/**
 * Estado segun el ultimo evento de Correo. Los nombres exactos de los
 * eventos no estan documentados (el manual solo muestra PREIMPOSICION y
 * CADUCA): hay que revisarlos con envios reales.
 */
export function estadoSegunEventos(eventos: Tracking["eventos"]): EstadoEnvio | null {
  const ultimo = eventos[0]?.evento.toUpperCase();
  if (!ultimo) return null;
  if (/ENTREGAD|ENTREGA EN/.test(ultimo) && !/NO ENTREG|INTENTO/.test(ultimo)) return "ENTREGADO";
  if (/PREIMPOSICION|CADUCA/.test(ultimo)) return "POR_ENVIAR";
  return "ENVIADO";
}

/**
 * Consulta el seguimiento de un envio ya dado de alta y actualiza su estado.
 * Al pasar a ENTREGADO registra la entrega de lo que faltaba de la venta,
 * igual que el cron de Tiendup. Devuelve true si se entrego en esta pasada.
 */
export async function actualizarSeguimiento(envio: Envio) {
  // Ver correo-argentino.ts: no esta claro que espera shippingId.
  const tracking = await consultarTracking(envio.trackingNumber ?? idCorreo(envio));
  const estado = estadoSegunEventos(tracking.eventos) ?? envio.estado;

  return prisma.$transaction(async (tx) => {
    await tx.envio.update({
      where: { id: envio.id },
      data: {
        estado,
        trackingNumber: tracking.trackingNumber ?? envio.trackingNumber,
        ultimoEvento: tracking.eventos[0]
          ? `${tracking.eventos[0].evento} (${tracking.eventos[0].fecha})`
          : envio.ultimoEvento,
        ultimaConsultaTracking: new Date(),
      },
    });

    if (estado !== "ENTREGADO") return false;
    const venta = await tx.venta.findUniqueOrThrow({
      where: { id: envio.ventaId },
    });
    const falta = venta.cantidad - venta.cantidadEntregada;
    if (falta > 0) {
      await tx.entrega.create({ data: { ventaId: venta.id, cantidad: falta } });
      await tx.venta.update({
        where: { id: venta.id },
        data: { cantidadEntregada: venta.cantidad },
      });
    }
    return true;
  });
}

/**
 * Saldo estimado de la cuenta de Correo: recargas registradas menos el costo
 * de los envios dados de alta. No es el saldo real de Correo (no hay API para
 * consultarlo): se desalinea si se opera por fuera del CRM.
 */
export async function saldoCorreo() {
  const [recargas, envios] = await Promise.all([
    prisma.recargaCorreo.aggregate({ _sum: { monto: true } }),
    prisma.envio.aggregate({
      _sum: { costoEnvioReal: true },
      where: { estado: { not: "ERROR_CREACION" } },
    }),
  ]);
  const recargado = recargas._sum.monto ?? new Prisma.Decimal(0);
  const gastado = envios._sum.costoEnvioReal ?? new Prisma.Decimal(0);
  return { recargado, gastado, saldo: recargado.minus(gastado) };
}
