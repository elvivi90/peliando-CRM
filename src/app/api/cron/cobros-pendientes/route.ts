import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { formatMoney, nombreCliente } from "@/lib/format";
import { resumenCuentasCorrientesPendientes } from "@/lib/services/cuenta-corriente";
import { enviarNotificacion } from "@/lib/services/notificaciones";

/**
 * Recordatorio semanal de cobros pendientes a todo el equipo. Lo llama el
 * cron de Vercel (ver vercel.json), que manda `Authorization: Bearer
 * <CRON_SECRET>` cuando la variable CRON_SECRET esta configurada en el
 * proyecto. Sin esa variable la ruta no responde, para que nadie pueda
 * disparar notificaciones desde afuera.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // El resumen tambien incluye clientes con solo entregas pendientes; aca
  // interesa la plata.
  const deudores = (await resumenCuentasCorrientesPendientes()).filter((c) =>
    c.saldoPendiente.gt(0),
  );
  if (deudores.length === 0) {
    return NextResponse.json({ ok: true, skipped: "sin saldos pendientes" });
  }

  const total = deudores.reduce((s, c) => s.plus(c.saldoPendiente), new Prisma.Decimal(0));
  const mayor = deudores[0];
  const clientes = deudores.length === 1 ? "1 cliente debe" : `${deudores.length} clientes deben`;

  await enviarNotificacion({
    titulo: "Cobros pendientes",
    cuerpo: `${clientes} ${formatMoney(total)}. Mayor saldo: ${nombreCliente(mayor.cliente)} (${formatMoney(mayor.saldoPendiente)}).`,
    url: "/dashboard",
    tag: "cobros-pendientes",
  });

  return NextResponse.json({ ok: true, clientes: deudores.length });
}
