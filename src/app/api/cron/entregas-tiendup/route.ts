import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { envioCompletado, fetchTiendupOrder } from "@/lib/services/tiendup";

/**
 * Chequeo diario de las ventas de Tiendup pendientes de entrega (ver
 * vercel.json). Consulta en Tiendup solo esas ordenes, no todas: cuando una
 * figura como enviada, registra la entrega de lo que faltaba y la venta pasa
 * a entregada. Protegida con CRON_SECRET, igual que cobros-pendientes.
 *
 * La entrega queda con la fecha del chequeo: Tiendup no informa cuando se
 * despacho, asi que puede quedar hasta un dia despues de la real.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const pendientes = await prisma.venta.findMany({
    where: {
      origen: "WEBHOOK_TIENDUP",
      tiendupOrderId: { not: null },
      cantidadEntregada: { lt: prisma.venta.fields.cantidad },
    },
    select: { id: true, tiendupOrderId: true, cantidad: true, cantidadEntregada: true },
    orderBy: { fecha: "asc" },
  });

  let entregadas = 0;
  const errores: number[] = [];

  for (const venta of pendientes) {
    try {
      const orden = await fetchTiendupOrder(venta.tiendupOrderId!, { timeoutMs: 10000 });
      if (!envioCompletado(orden)) continue;

      await prisma.$transaction([
        prisma.entrega.create({
          data: { ventaId: venta.id, cantidad: venta.cantidad - venta.cantidadEntregada },
        }),
        prisma.venta.update({
          where: { id: venta.id },
          data: { cantidadEntregada: venta.cantidad },
        }),
      ]);
      revalidatePath(`/ventas/${venta.id}`);
      entregadas++;
    } catch (err) {
      // Una orden que falla no frena al resto; se reintenta al dia siguiente.
      console.error(`[tiendup] chequeo de entrega de la orden #${venta.tiendupOrderId}:`, err);
      errores.push(venta.tiendupOrderId!);
    }
  }

  if (entregadas > 0) {
    revalidatePath("/ventas");
    revalidatePath("/dashboard");
  }

  return NextResponse.json({
    ok: true,
    revisadas: pendientes.length,
    entregadas,
    siguenPendientes: pendientes.length - entregadas - errores.length,
    errores,
  });
}
