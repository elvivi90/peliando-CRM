import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { correoConfigurado } from "@/lib/services/correo-argentino";
import { actualizarSeguimiento } from "@/lib/services/envios";

/**
 * Seguimiento diario de los envios por Correo Argentino que todavia no se
 * entregaron (ver vercel.json). Cuando uno figura entregado, la venta pasa a
 * entregada (ver actualizarSeguimiento). Protegida con CRON_SECRET, igual
 * que entregas-tiendup.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!correoConfigurado()) {
    return NextResponse.json({ ok: true, skipped: "Correo Argentino sin configurar" });
  }

  // Solo los que estan dados de alta (con costo): los ERROR_CREACION no
  // existen en Correo.
  const pendientes = await prisma.envio.findMany({
    where: { estado: { in: ["POR_ENVIAR", "ENVIADO"] }, costoEnvioReal: { not: null } },
    orderBy: { createdAt: "asc" },
  });

  let entregados = 0;
  const errores: number[] = [];
  for (const envio of pendientes) {
    try {
      if (await actualizarSeguimiento(envio)) entregados++;
      revalidatePath(`/ventas/${envio.ventaId}`);
    } catch (err) {
      // Uno que falla no frena al resto; se reintenta al dia siguiente.
      console.error(`[correo] seguimiento del envio ${envio.numero}:`, err);
      errores.push(envio.numero);
    }
  }

  if (pendientes.length > 0) {
    revalidatePath("/ventas");
    revalidatePath("/dashboard");
  }

  return NextResponse.json({ ok: true, revisados: pendientes.length, entregados, errores });
}
