import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

// Unico usuario habilitado para borrar entidades (clientes, ventas, eventos,
// gastos). El resto del equipo comparte el mismo rol Admin sin permisos
// diferenciados (ver seccion 2 de la especificacion); esto es la unica
// excepcion, a pedido explicito.
const ADMIN_PRINCIPAL_EMAIL = "agustin.evillalba@gmail.com";

/**
 * Los 4 usuarios del equipo comparten el rol Admin (ver seccion 2 de la
 * especificacion). Cualquier cuenta autenticada en Supabase Auth se
 * autoprovisiona como Usuario en la primera visita.
 */
export async function getCurrentUsuario() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // En el camino frecuente (cada navegacion) alcanza con una lectura; el
  // upsert solo hace falta la primera vez que alguien inicia sesion.
  const existente = await prisma.usuario.findUnique({ where: { authId: user.id } });
  if (existente) return existente;

  return prisma.usuario.upsert({
    where: { authId: user.id },
    update: {},
    create: {
      authId: user.id,
      email: user.email ?? `${user.id}@sin-email.local`,
      nombre:
        (user.user_metadata?.nombre as string | undefined) ??
        user.email?.split("@")[0] ??
        "Usuario",
    },
  });
}

/** Para gatear en la UI que solo el admin principal vea los botones de eliminar. */
export function esAdminPrincipal(usuario: { email: string }) {
  return usuario.email === ADMIN_PRINCIPAL_EMAIL;
}

/**
 * Guard para las acciones de eliminar: se llama al principio de cada una.
 * No alcanza con ocultar el boton en la UI, porque una server action se
 * puede invocar directo sin pasar por la pantalla.
 */
export async function requireAdminPrincipal() {
  const usuario = await getCurrentUsuario();
  if (!esAdminPrincipal(usuario)) {
    throw new Error("No tenés permiso para eliminar esto.");
  }
  return usuario;
}
