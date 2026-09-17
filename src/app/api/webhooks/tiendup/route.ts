import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sugerirPrecio, PricingError } from "@/lib/pricing";

/**
 * Webhook de Tiendup (seccion 3.3): permite que una venta minorista se cree
 * automaticamente desde la pagina de Tiendup, sin intervencion manual.
 *
 * Contrato esperado (ajustar cuando se tenga la doc real de Tiendup):
 * POST /api/webhooks/tiendup
 * Header: x-webhook-secret: <TIENDUP_WEBHOOK_SECRET>
 * Body JSON: {
 *   clienteEmail: string,
 *   clienteNombre?: string,
 *   clienteApellido?: string,
 *   productoId?: string,        // si no se manda, se usa el unico producto existente
 *   cantidad: number,
 *   precioTotal?: number,       // si no se manda, se usa el PVP de la lista activa
 *   fecha?: string              // ISO date, default: ahora
 * }
 */

const SISTEMA_AUTH_ID = "sistema-tiendup";

const bodySchema = z.object({
  clienteEmail: z.string().email(),
  clienteNombre: z.string().trim().optional(),
  clienteApellido: z.string().trim().optional(),
  productoId: z.string().optional(),
  cantidad: z.coerce.number().int().positive(),
  precioTotal: z.coerce.number().positive().optional(),
  fecha: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const secretHeader = request.headers.get("x-webhook-secret");
  if (!process.env.TIENDUP_WEBHOOK_SECRET || secretHeader !== process.env.TIENDUP_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const producto = data.productoId
    ? await prisma.producto.findUnique({ where: { id: data.productoId } })
    : await prisma.producto.findFirst({ orderBy: { createdAt: "asc" } });

  if (!producto) {
    return NextResponse.json({ error: "No se encontro el producto" }, { status: 404 });
  }
  if (producto.stockActual < data.cantidad) {
    return NextResponse.json(
      { error: `Stock insuficiente (disponible: ${producto.stockActual})` },
      { status: 409 },
    );
  }

  const [cliente, usuarioSistema] = await Promise.all([
    prisma.cliente.upsert({
      where: { email: data.clienteEmail },
      update: {},
      create: {
        nombre: data.clienteNombre || data.clienteEmail.split("@")[0],
        apellido: data.clienteApellido || "",
        email: data.clienteEmail,
        tipo: "MINORISTA",
      },
    }),
    prisma.usuario.upsert({
      where: { authId: SISTEMA_AUTH_ID },
      update: {},
      create: {
        authId: SISTEMA_AUTH_ID,
        nombre: "Tiendup (automático)",
        email: "tiendup@sistema.local",
      },
    }),
  ]);

  let precioUnitario: number;
  let precioTotal: number;
  let listaId: string | null = null;

  if (data.precioTotal) {
    precioTotal = data.precioTotal;
    precioUnitario = data.precioTotal / data.cantidad;
  } else {
    try {
      const sugerencia = await sugerirPrecio({ tipo: "MINORISTA", cantidad: data.cantidad });
      precioUnitario = sugerencia.precioUnitario.toNumber();
      precioTotal = sugerencia.precioTotal.toNumber();
      listaId = sugerencia.listaId;
    } catch (err) {
      const message = err instanceof PricingError ? err.message : "Error al calcular el precio";
      return NextResponse.json({ error: message }, { status: 422 });
    }
  }

  const fecha = data.fecha ? new Date(data.fecha) : new Date();

  const venta = await prisma.$transaction(async (tx) => {
    const nuevaVenta = await tx.venta.create({
      data: {
        clienteId: cliente.id,
        productoId: producto.id,
        usuarioId: usuarioSistema.id,
        tipo: "MINORISTA",
        listaId,
        cantidad: data.cantidad,
        cantidadEntregada: data.cantidad,
        precioUnitario,
        precioTotal,
        montoCobrado: precioTotal,
        origen: "WEBHOOK_TIENDUP",
        fecha,
      },
    });

    await tx.entrega.create({
      data: { ventaId: nuevaVenta.id, cantidad: data.cantidad, fecha },
    });

    await tx.producto.update({
      where: { id: producto.id },
      data: { stockActual: { decrement: data.cantidad } },
    });

    return nuevaVenta;
  });

  return NextResponse.json({ ok: true, ventaId: venta.id }, { status: 201 });
}
