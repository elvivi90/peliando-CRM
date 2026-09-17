"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { listaPreciosSchema, type ListaPreciosInput } from "@/lib/validation/lista-precios";

export async function crearListaPrecios(input: ListaPreciosInput) {
  const data = listaPreciosSchema.parse(input);

  await prisma.$transaction(async (tx) => {
    await tx.listaDePrecios.updateMany({
      where: { estado: "ACTIVA" },
      data: { estado: "HISTORICA", fechaFinVigencia: new Date() },
    });

    await tx.listaDePrecios.create({
      data: {
        nombre: data.nombre,
        pvp: data.pvp,
        estado: "ACTIVA",
        fechaInicioVigencia: new Date(),
        tramos: {
          create: data.tramos
            .sort((a, b) => a.cantidadDesde - b.cantidadDesde)
            .map((t) => ({ cantidadDesde: t.cantidadDesde, precioUnitario: t.precioUnitario })),
        },
      },
    });
  });

  revalidatePath("/precios");
  redirect("/precios");
}
