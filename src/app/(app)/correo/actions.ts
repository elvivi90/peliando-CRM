"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUsuario, requireAdminPrincipal } from "@/lib/auth";
import { parseFechaInput } from "@/lib/date";

const recargaSchema = z.object({
  monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
  fecha: z.string().min(1, "Falta la fecha"),
});

// Una recarga hecha en el portal de Correo: suma al saldo estimado.
export async function registrarRecarga(input: { monto: string; fecha: string }) {
  const data = recargaSchema.parse(input);
  const usuario = await getCurrentUsuario();

  await prisma.recargaCorreo.create({
    data: { monto: data.monto, fecha: parseFechaInput(data.fecha), usuarioId: usuario.id },
  });
  revalidatePath("/correo");
}

// Solo el admin principal, como el resto de los borrados.
export async function eliminarRecarga(id: string) {
  await requireAdminPrincipal();
  await prisma.recargaCorreo.delete({ where: { id } });
  revalidatePath("/correo");
}
