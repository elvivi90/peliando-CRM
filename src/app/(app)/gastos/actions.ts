"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUsuario } from "@/lib/auth";
import { parseFechaInput } from "@/lib/date";

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

  revalidatePath("/gastos");
  revalidatePath("/dashboard");
  redirect("/gastos");
}
