import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { differenceInCalendarDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { nombreCliente } from "@/lib/format";
import { envioCompletado, fetchTiendupOrder } from "@/lib/services/tiendup";
import { enviarNotificacion } from "@/lib/services/notificaciones";

// Un pedido pago que lleva mas que esto sin entregarse dispara el aviso.
const DIAS_PARA_AVISAR = 3;

/**
 * Chequeo diario de las ventas de Tiendup pendientes de entrega (ver
 * vercel.json). Consulta en Tiendup solo esas ordenes, no todas: cuando una
 * figura como enviada, registra la entrega de lo que faltaba y la venta pasa
 * a entregada. Despues, si quedan pedidos pagados hace mas de
 * DIAS_PARA_AVISAR dias sin entregar, avisa al equipo. Protegida con
 * CRON_SECRET, igual que cobros-pendientes.
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
    include: { cliente: true },
    orderBy: { fecha: "asc" },
  });

  const entregadas = new Set<string>();
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
      entregadas.add(venta.id);
    } catch (err) {
      // Una orden que falla no frena al resto; se reintenta al dia siguiente.
      console.error(`[tiendup] chequeo de entrega de la orden #${venta.tiendupOrderId}:`, err);
      errores.push(venta.tiendupOrderId!);
    }
  }

  if (entregadas.size > 0) {
    revalidatePath("/ventas");
    revalidatePath("/dashboard");
  }

  // Las que siguen sin entregar (incluidas las que no se pudieron consultar
  // hoy) y ya pasaron el plazo. `pendientes` viene ordenado de la mas vieja
  // a la mas nueva.
  const hoy = new Date();
  const atrasadas = pendientes.filter(
    (v) => !entregadas.has(v.id) && differenceInCalendarDays(hoy, v.fecha) > DIAS_PARA_AVISAR,
  );
  if (atrasadas.length > 0) {
    const masVieja = atrasadas[0];
    const pedidos = atrasadas.length === 1 ? "1 pedido" : `${atrasadas.length} pedidos`;
    await enviarNotificacion({
      titulo: "Pedidos sin entregar",
      cuerpo:
        `${pedidos} de Tiendup pagados hace más de ${DIAS_PARA_AVISAR} días sin entregar. ` +
        `El más viejo: ${masVieja.descripcion?.replace("Tiendup orden ", "") ?? ""} de ` +
        `${nombreCliente(masVieja.cliente)} (hace ${differenceInCalendarDays(hoy, masVieja.fecha)} días).`,
      url: "/ventas?pendientes=1",
      tag: "entregas-pendientes",
    });
  }

  return NextResponse.json({
    ok: true,
    revisadas: pendientes.length,
    entregadas: entregadas.size,
    siguenPendientes: pendientes.length - entregadas.size - errores.length,
    atrasadas: atrasadas.length,
    errores,
  });
}
