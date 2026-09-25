import { NextRequest, NextResponse, after } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseFechaHoraArgentina } from "@/lib/date";
import { formatMoney, nombreCliente } from "@/lib/format";
import { enviarNotificacion } from "@/lib/services/notificaciones";
import { fetchTiendupOrder, type TiendupOrder } from "@/lib/services/tiendup";

/**
 * Webhook de Tiendup (seccion 3.3): crea automaticamente una venta minorista
 * cuando se confirma el pago de una orden en Tiendup.
 *
 * Referencia (relevada de https://public-api.tiendup.com/openapi y
 * https://intercom.help/tiendup/es/articles/13833124-webhooks-en-tiendup):
 * - En el panel de Tiendup (Configuraciones -> Webhooks) se crea un webhook
 *   con esta URL, suscripto SOLO al evento `orders.payment_paid` (no
 *   `orders.creation`, que puede no llegar a pagarse nunca). Tiendup genera
 *   ahi un secreto propio para firmar los requests.
 * - Cada request llega firmado con el header `x-tiendup-signature`. El
 *   algoritmo exacto no esta documentado publicamente; se asume HMAC-SHA256
 *   sobre el body crudo (convencion estandar de la industria). Si Tiendup
 *   usa otro esquema, este chequeo va a rechazar todo y hay que ajustarlo
 *   con un ejemplo real (Tiendup permite "enviar evento de prueba").
 * - El body del evento en si NO esta documentado, asi que en vez de confiar
 *   en su forma exacta, solo se usa para sacar el id de la orden; el resto
 *   de los datos (cliente, items, precio) se trae con la fuente de verdad:
 *   GET /orders/{order_id} de la API publica (autenticada con X-API-Key).
 *
 * Forma real del evento (relevada del "evento de prueba" del panel):
 *   { "type": "webhooks.test", "event_id": "...",
 *     "reference": { "id": 191, "object": "webhook_endpoint" },
 *     "business_id": 81394, "occurred_at": "2026-09-20 13:20:58" }
 * Es decir: el tipo va en `type` (no `event`) y el id del objeto afectado en
 * `reference.id`. Para orders.payment_paid se asume que `reference` apunta a
 * la orden (`object: "order"`), por analogia; a confirmar con un evento real.
 */

const SISTEMA_AUTH_ID = "sistema-tiendup";

function verificarFirma(rawBody: string, signatureHeader: string | null, secret: string) {
  if (!signatureHeader) return false;

  const esperado = createHmac("sha256", secret).update(rawBody).digest("hex");
  const recibido = signatureHeader.replace(/^sha256=/, "").trim();

  const a = Buffer.from(esperado, "hex");
  const b = Buffer.from(recibido, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function extraerOrderId(body: unknown): number | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const reference = b.reference as Record<string, unknown> | undefined;
  const data = b.data as Record<string, unknown> | undefined;

  // `reference.id` es lo que manda Tiendup; el resto son respaldos por si el
  // evento de pago trae otra forma.
  const candidato =
    reference?.id ?? data?.id ?? data?.order_id ?? b.order_id ?? b.resource_id;
  const n = Number(candidato);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function POST(request: NextRequest) {
  const secret = process.env.TIENDUP_WEBHOOK_SECRET;
  const apiKey = process.env.TIENDUP_API_KEY;

  if (!secret || !apiKey) {
    return NextResponse.json(
      { error: "Falta configurar TIENDUP_WEBHOOK_SECRET o TIENDUP_API_KEY" },
      { status: 500 },
    );
  }

  const rawBody = await request.text();

  if (!verificarFirma(rawBody, request.headers.get("x-tiendup-signature"), secret)) {
    // Solo nombres de headers (nunca valores): sirve para ver en los logs si
    // Tiendup manda la firma con otro nombre o con otro esquema.
    console.warn("[tiendup] firma invalida. Headers recibidos:", [...request.headers.keys()].join(", "));
    return NextResponse.json({ error: "Firma invalida" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  // Solo nos interesa el pago confirmado; cualquier otro evento (incluido
  // "webhooks.test", el de prueba del panel) se reconoce con 200 y sin efecto
  // para que Tiendup no lo siga reintentando.
  const b = body as Record<string, unknown>;
  const eventType = (b?.type ?? b?.event) as string | undefined;
  if (eventType !== "orders.payment_paid") {
    return NextResponse.json({ ok: true, skipped: eventType ?? "sin tipo" });
  }

  const orderId = extraerOrderId(body);
  if (!orderId) {
    return NextResponse.json({ error: "No se encontro el id de la orden en el evento" }, { status: 400 });
  }

  // Atajo para reintentos obvios: evita volver a golpear la API de Tiendup.
  // La garantia real de no duplicar viene de la restriccion @unique en
  // tiendupOrderId (ver el catch del create mas abajo), no de este chequeo:
  // si dos entregas del mismo evento llegan casi juntas, las dos podrian
  // pasar este find antes de que la primera termine de insertar.
  const yaExiste = await prisma.venta.findFirst({ where: { tiendupOrderId: orderId } });
  if (yaExiste) {
    return NextResponse.json({ ok: true, ventaId: yaExiste.id, duplicado: true });
  }

  let order: TiendupOrder;
  try {
    order = await fetchTiendupOrder(orderId);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al consultar la orden" },
      { status: 502 },
    );
  }

  const cantidad = order.items
    .filter((i) => !i.ecommerce_type || i.ecommerce_type === "retail")
    .reduce((s, i) => s + (i.quantity ?? 0), 0);

  if (cantidad <= 0) {
    return NextResponse.json({ ok: true, skipped: "sin items de producto fisico" });
  }

  const precioTotal = Number(order.total_amount);
  if (!Number.isFinite(precioTotal)) {
    return NextResponse.json({ error: "total_amount invalido en la orden" }, { status: 502 });
  }
  const precioUnitario = precioTotal / cantidad;

  const producto = await prisma.producto.findFirst({ orderBy: { createdAt: "asc" } });
  if (!producto) {
    return NextResponse.json({ error: "No hay ningun producto cargado en el CRM" }, { status: 404 });
  }
  // La orden ya esta pagada: la venta se registra igual aunque el stock del
  // CRM este desactualizado. El stock puede quedar en negativo a proposito,
  // como alerta de que hay que recontar/reponer — nunca se pierde una venta
  // ya cobrada por una diferencia de stock.
  if (producto.stockActual < cantidad) {
    console.warn(
      `[tiendup] orden #${orderId}: stock insuficiente de "${producto.nombre}" ` +
        `(disponible: ${producto.stockActual}, vendido: ${cantidad}). Se registra igual, stock queda en negativo.`,
    );
  }

  const nombre = order.customer.name || order.customer.last_name || order.customer.email.split("@")[0];
  const apellido = order.customer.name && order.customer.last_name ? order.customer.last_name : "";

  const [cliente, usuarioSistema] = await Promise.all([
    prisma.cliente.upsert({
      where: { email: order.customer.email },
      update: {},
      create: { nombre, apellido, email: order.customer.email, tipo: "MINORISTA" },
    }),
    prisma.usuario.upsert({
      where: { authId: SISTEMA_AUTH_ID },
      update: {},
      create: { authId: SISTEMA_AUTH_ID, nombre: "Tiendup (automático)", email: "tiendup@sistema.local" },
    }),
  ]);

  // `number` es el numero de orden que ven el equipo y el cliente en Tiendup
  // (#54); `orderId` es el id interno de la API (#5465469).
  const descripcion = `Tiendup orden #${order.number ?? orderId}`;

  // creation_date viene en hora de Argentina (ver lib/date.ts).
  const fecha = parseFechaHoraArgentina(order.creation_date);

  try {
    const venta = await prisma.$transaction(async (tx) => {
      const nuevaVenta = await tx.venta.create({
        data: {
          clienteId: cliente.id,
          productoId: producto.id,
          usuarioId: usuarioSistema.id,
          tipo: "MINORISTA",
          cantidad,
          cantidadEntregada: cantidad,
          precioUnitario,
          precioTotal,
          montoCobrado: precioTotal,
          origen: "WEBHOOK_TIENDUP",
          fecha,
          descripcion,
          tiendupOrderId: orderId,
        },
      });

      await tx.entrega.create({ data: { ventaId: nuevaVenta.id, cantidad, fecha } });
      await tx.producto.update({
        where: { id: producto.id },
        data: { stockActual: { decrement: cantidad } },
      });

      return nuevaVenta;
    });

    // Solo aca y no en los caminos de duplicado: un reintento de Tiendup no
    // tiene que volver a avisar la misma venta.
    after(() =>
      enviarNotificacion({
        titulo: "Venta en Tiendup",
        cuerpo: `${nombreCliente(cliente)} · ${cantidad} u. · ${formatMoney(precioTotal)}`,
        url: `/ventas/${venta.id}`,
      }),
    );

    return NextResponse.json({ ok: true, ventaId: venta.id }, { status: 201 });
  } catch (err) {
    // Dos entregas del mismo evento llegaron casi juntas y las dos pasaron el
    // chequeo de arriba: la restriccion @unique de tiendupOrderId rechaza la
    // segunda insercion. Se busca la venta que sí se creo y se responde igual
    // que en el chequeo temprano, en vez de duplicar o devolver un error.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const venta = await prisma.venta.findUnique({ where: { tiendupOrderId: orderId } });
      if (venta) return NextResponse.json({ ok: true, ventaId: venta.id, duplicado: true });
    }
    throw err;
  }
}
