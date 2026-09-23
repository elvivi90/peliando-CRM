"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminPrincipal } from "@/lib/auth";
import { parseFechaInput } from "@/lib/date";

const eventoSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  fecha: z.string().min(1, "La fecha es obligatoria"),
  lugar: z.string().trim().optional(),
});

export async function crearEvento(input: { nombre: string; fecha: string; lugar: string }) {
  const data = eventoSchema.parse(input);

  const evento = await prisma.evento.create({
    data: {
      nombre: data.nombre,
      fecha: parseFechaInput(data.fecha),
      lugar: data.lugar || null,
    },
  });

  revalidatePath("/eventos");
  redirect(`/eventos/${evento.id}`);
}

// Alta desde el modal de Nueva venta: devuelve el evento sin redirigir.
export async function crearEventoRapido(input: { nombre: string; fecha: string; lugar: string }) {
  const data = eventoSchema.parse(input);

  const evento = await prisma.evento.create({
    data: {
      nombre: data.nombre,
      fecha: parseFechaInput(data.fecha),
      lugar: data.lugar || null,
    },
    select: { id: true, nombre: true },
  });

  revalidatePath("/eventos");
  return evento;
}

// Solo el admin principal (ver lib/auth.ts). ventas_eventoId_fkey y
// gastos_eventoId_fkey son SET NULL: borrar el evento solo lo desvincula de
// sus ventas y gastos, que quedan intactos (el evento es un agrupador, no
// un registro financiero en si mismo).
export async function eliminarEvento(id: string) {
  await requireAdminPrincipal();

  await prisma.evento.delete({ where: { id } });

  revalidatePath("/eventos");
  revalidatePath("/dashboard");
  revalidatePath("/ventas");
  revalidatePath("/gastos");
  redirect("/eventos");
}
