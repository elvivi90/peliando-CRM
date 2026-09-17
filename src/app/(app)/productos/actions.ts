"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const productoSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  descripcion: z.string().trim().optional(),
  stockActual: z.coerce.number().int().min(0, "El stock no puede ser negativo"),
});

export async function crearProducto(input: {
  nombre: string;
  descripcion: string;
  stockActual: string;
}) {
  const data = productoSchema.parse(input);

  await prisma.producto.create({
    data: {
      nombre: data.nombre,
      descripcion: data.descripcion || null,
      stockActual: data.stockActual,
    },
  });

  revalidatePath("/productos");
  redirect("/productos");
}

export async function ajustarStock(productoId: string, nuevoStock: number) {
  if (nuevoStock < 0) throw new Error("El stock no puede ser negativo");

  await prisma.producto.update({
    where: { id: productoId },
    data: { stockActual: nuevoStock },
  });

  revalidatePath("/productos");
}
