"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUsuario } from "@/lib/auth";
import { enviarNotificacion } from "@/lib/services/notificaciones";

// Forma de PushSubscription.toJSON() del navegador.
const suscripcionSchema = z.object({
  endpoint: z.url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function activarNotificaciones(input: unknown) {
  const { endpoint, keys } = suscripcionSchema.parse(input);
  const usuario = await getCurrentUsuario();

  // Upsert por endpoint: si otro usuario inicio sesion antes en el mismo
  // celular, la suscripcion pasa a ser de quien la activo ahora.
  await prisma.suscripcionPush.upsert({
    where: { endpoint },
    update: { usuarioId: usuario.id, p256dh: keys.p256dh, auth: keys.auth },
    create: { usuarioId: usuario.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  });
}

export async function desactivarNotificaciones(endpoint: string) {
  const usuario = await getCurrentUsuario();
  await prisma.suscripcionPush.deleteMany({ where: { endpoint, usuarioId: usuario.id } });
}

// Solo a los celulares del propio usuario, para probar que llegan.
export async function enviarNotificacionDePrueba() {
  const usuario = await getCurrentUsuario();
  await enviarNotificacion(
    {
      titulo: "Notificaciones activadas",
      cuerpo: "Así te van a llegar los avisos del CRM.",
      url: "/mas",
      tag: "prueba",
    },
    { soloUsuarioId: usuario.id },
  );
}
