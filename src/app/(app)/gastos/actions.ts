"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUsuario, requireAdminPrincipal } from "@/lib/auth";
import { parseFechaInput } from "@/lib/date";
import { formatMoney } from "@/lib/format";
import { enviarNotificacion } from "@/lib/services/notificaciones";

const gastoSchema = z.object({
  categoria: z.enum(["TRANSPORTE", "COMIDA", "MARKETING_PRODUCCION", "OTROS"]),
  concepto: z.string().trim().min(1, "El concepto es obligatorio"),
  monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
  fecha: z.string().min(1),
  eventoId: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v : undefined)),
});

export async function crearGasto(input: {
  categoria: string;
  concepto: string;
  monto: string;
  fecha: string;
  eventoId: string;
}) {
  const data = gastoSchema.parse(input);
  const usuario = await getCurrentUsuario();

  await prisma.gasto.create({
    data: {
      categoria: data.categoria,
      concepto: data.concepto,
      monto: data.monto,
      fecha: parseFechaInput(data.fecha),
      eventoId: data.eventoId ?? null,
      usuarioId: usuario.id,
    },
  });

  after(() =>
    enviarNotificacion(
      {
        titulo: `Nuevo gasto de ${usuario.nombre}`,
        cuerpo: `${data.concepto} · ${formatMoney(data.monto)}`,
        url: "/gastos",
      },
      { excluirUsuarioId: usuario.id },
    ),
  );

  revalidatePath("/gastos");
  revalidatePath("/dashboard");
  redirect("/gastos");
}

// Solo el admin principal (ver lib/auth.ts). Nada referencia a Gasto, asi
// que el delete es directo. Se queda en /gastos (no hay redirect): se llama
// desde un boton inline en la tabla, no desde una pagina de detalle.
export async function eliminarGasto(id: string) {
  await requireAdminPrincipal();

  const gasto = await prisma.gasto.findUniqueOrThrow({ where: { id } });
  await prisma.gasto.delete({ where: { id } });

  revalidatePath("/gastos");
  revalidatePath("/dashboard");
  if (gasto.eventoId) revalidatePath(`/eventos/${gasto.eventoId}`);
}
