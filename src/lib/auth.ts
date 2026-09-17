import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

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

  const usuario = await prisma.usuario.upsert({
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

  return usuario;
}
