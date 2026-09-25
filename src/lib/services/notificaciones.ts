import webpush, { WebPushError } from "web-push";
import { prisma } from "@/lib/prisma";

export type Notificacion = {
  titulo: string;
  cuerpo: string;
  // Ruta de la app que se abre al tocar la notificacion.
  url: string;
  // Notificaciones con el mismo tag se reemplazan en vez de apilarse.
  tag?: string;
};

let vapidConfigurado: boolean | null = null;

function configurarVapid() {
  if (vapidConfigurado !== null) return vapidConfigurado;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    console.warn("[push] faltan las variables VAPID: no se envian notificaciones");
    vapidConfigurado = false;
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigurado = true;
  return true;
}

/**
 * Manda la notificacion a todos los celulares suscriptos. Nunca tira: una
 * notificacion que no llega no puede romper la venta o el gasto que la
 * disparo. Pensado para llamarse dentro de `after()`, asi no demora la
 * respuesta.
 */
export async function enviarNotificacion(
  notificacion: Notificacion,
  filtro: { excluirUsuarioId?: string; soloUsuarioId?: string } = {},
) {
  if (!configurarVapid()) return;

  try {
    const usuarioId =
      filtro.soloUsuarioId ??
      (filtro.excluirUsuarioId ? { not: filtro.excluirUsuarioId } : undefined);
    const suscripciones = await prisma.suscripcionPush.findMany({ where: { usuarioId } });

    const payload = JSON.stringify(notificacion);
    await Promise.all(
      suscripciones.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          );
        } catch (err) {
          // 404/410: el usuario desinstalo la app o revoco el permiso; la
          // suscripcion no va a volver a servir.
          if (err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410)) {
            await prisma.suscripcionPush.deleteMany({ where: { id: s.id } });
          } else {
            console.error("[push] error enviando notificacion:", err);
          }
        }
      }),
    );
  } catch (err) {
    console.error("[push] error enviando notificaciones:", err);
  }
}
