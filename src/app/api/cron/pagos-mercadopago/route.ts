import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { mercadoPagoConfigurado } from "@/lib/services/mercado-pago";
import { sincronizarPagos } from "@/lib/services/pagos-mercadopago";

// Ventana del chequeo diario: cubre algunos dias sin correr el cron.
const DIAS_HACIA_ATRAS = 7;

/**
 * Copia diaria de los pagos de Mercado Pago de las ventas de Tiendup (ver
 * vercel.json y sincronizarPagos). Filtra por ultima actualizacion, asi
 * tambien trae los pagos viejos que se devolvieron o contracargaron.
 *
 * Carga inicial: ?desde=2026-01-01 busca por fecha de creacion desde ese
 * dia (una sola vez, a mano). Protegida con CRON_SECRET, igual que
 * envios-correo.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!mercadoPagoConfigurado()) {
    return NextResponse.json({ ok: true, skipped: "Mercado Pago sin configurar" });
  }

  const desdeParam = request.nextUrl.searchParams.get("desde");
  const desde = desdeParam
    ? new Date(`${desdeParam}T00:00:00-03:00`)
    : new Date(Date.now() - DIAS_HACIA_ATRAS * 86_400_000);
  if (Number.isNaN(desde.getTime())) {
    return NextResponse.json({ error: "desde tiene que ser AAAA-MM-DD" }, { status: 400 });
  }

  const resultado = await sincronizarPagos({
    desde,
    hasta: new Date(),
    rango: desdeParam ? "date_created" : "date_last_updated",
  });

  if (resultado.guardados > 0) {
    revalidatePath("/reportes/mercadopago");
    revalidatePath("/reportes");
    revalidatePath("/ventas/[id]", "page");
  }

  return NextResponse.json({ ok: true, ...resultado });
}
