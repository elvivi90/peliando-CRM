"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
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
