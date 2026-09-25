"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUsuario, requireAdminPrincipal } from "@/lib/auth";
import { parseFechaInput } from "@/lib/date";
import { formatMoney } from "@/lib/format";
import { enviarNotificacion } from "@/lib/services/notificaciones";

const gastoSchema = z.object({
  tipo: z.enum(["OPERATIVO", "INVERSION"]),
  categoria: z.enum(["TRANSPORTE", "COMIDA", "MARKETING_PRODUCCION", "OTROS"]),
  concepto: z.string().trim().min(1, "El concepto es obligatorio"),
  monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
  fecha: z.string().min(1),
  eventoId: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v : undefined)),
  unidadesGeneradas: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.coerce
      .number()
      .int("Las unidades deben ser un número entero")
      .positive("Las unidades deben ser mayores a 0")
      .optional(),
  ),
});

export async function crearGasto(input: {
  tipo: string;
  categoria: string;
  concepto: string;
  monto: string;
  fecha: string;
  eventoId: string;
  unidadesGeneradas: string;
}) {
  const data = gastoSchema.parse(input);
  const usuario = await getCurrentUsuario();

  // Las unidades solo tienen sentido en una inversion de produccion (y ahi
  // son obligatorias); en cualquier otro caso se descartan aunque el
  // formulario las mande. La inversion tampoco va asociada a un evento.
  const esInversion = data.tipo === "INVERSION";
  const esProduccion = esInversion && data.categoria === "MARKETING_PRODUCCION";
  if (esProduccion && data.unidadesGeneradas === undefined) {
    throw new Error("Cargá las unidades generadas por la producción.");
  }
  const unidadesGeneradas = esProduccion ? (data.unidadesGeneradas ?? null) : null;
  const costoUnitario = unidadesGeneradas
    ? new Prisma.Decimal(data.monto).div(unidadesGeneradas).toDecimalPlaces(2)
    : null;

  await prisma.gasto.create({
    data: {
      tipo: data.tipo,
      categoria: data.categoria,
      concepto: data.concepto,
      monto: data.monto,
      fecha: parseFechaInput(data.fecha),
      eventoId: esInversion ? null : (data.eventoId ?? null),
      usuarioId: usuario.id,
      unidadesGeneradas,
      costoUnitario,
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
  revalidatePath("/reportes");
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
