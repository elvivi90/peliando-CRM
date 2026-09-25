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

type GastoInput = {
  tipo: string;
  categoria: string;
  concepto: string;
  monto: string;
  fecha: string;
  eventoId: string;
  unidadesGeneradas: string;
};

// Validacion y campos calculados comunes a crear y editar.
function datosGasto(input: GastoInput) {
  const data = gastoSchema.parse(input);

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

  return {
    tipo: data.tipo,
    categoria: data.categoria,
    concepto: data.concepto,
    monto: data.monto,
    fecha: parseFechaInput(data.fecha),
    eventoId: esInversion ? null : (data.eventoId ?? null),
    unidadesGeneradas,
    costoUnitario,
  };
}

function revalidarGasto(eventoIds: (string | null)[]) {
  revalidatePath("/gastos");
  revalidatePath("/dashboard");
  revalidatePath("/reportes");
  for (const id of new Set(eventoIds)) {
    if (id) revalidatePath(`/eventos/${id}`);
  }
}

export async function crearGasto(input: GastoInput) {
  const datos = datosGasto(input);
  const usuario = await getCurrentUsuario();

  await prisma.gasto.create({ data: { ...datos, usuarioId: usuario.id } });

  after(() =>
    enviarNotificacion(
      {
        titulo: `Nuevo gasto de ${usuario.nombre}`,
        cuerpo: `${datos.concepto} · ${formatMoney(datos.monto)}`,
        url: "/gastos",
      },
      { excluirUsuarioId: usuario.id },
    ),
  );

  revalidarGasto([datos.eventoId]);
  redirect("/gastos");
}

// Cualquier usuario puede editar (igual que clientes); solo borrar es del
// admin principal. usuarioId no se toca: queda quien lo cargo. Editar no
// notifica: el aviso es para enterarse de gastos nuevos.
export async function actualizarGasto(id: string, input: GastoInput) {
  const datos = datosGasto(input);
  await getCurrentUsuario();

  const anterior = await prisma.gasto.findUniqueOrThrow({ where: { id } });
  await prisma.gasto.update({ where: { id }, data: datos });

  // Tambien el evento anterior, si el gasto se movio de evento.
  revalidarGasto([anterior.eventoId, datos.eventoId]);
  redirect("/gastos");
}

// Solo el admin principal (ver lib/auth.ts). Nada referencia a Gasto, asi
// que el delete es directo. Se queda en /gastos (no hay redirect): se llama
// desde un boton inline en la tabla, no desde una pagina de detalle.
export async function eliminarGasto(id: string) {
  await requireAdminPrincipal();

  const gasto = await prisma.gasto.findUniqueOrThrow({ where: { id } });
  await prisma.gasto.delete({ where: { id } });

  revalidarGasto([gasto.eventoId]);
}
