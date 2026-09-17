"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUsuario } from "@/lib/auth";
import { clienteSchema, type ClienteInput } from "@/lib/validation/cliente";

export async function crearCliente(input: ClienteInput) {
  const data = clienteSchema.parse(input);

  const cliente = await prisma.cliente.create({
    data: {
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email || null,
      telefono: data.telefono || null,
      direccion: data.direccion || null,
      tipo: data.tipo,
      precioParticular: data.precioParticular ? Number(data.precioParticular) : null,
      listaPrecioId: data.listaPrecioId ?? null,
    },
  });

  revalidatePath("/clientes");
  redirect(`/clientes/${cliente.id}`);
}

export async function actualizarCliente(id: string, input: ClienteInput) {
  const data = clienteSchema.parse(input);

  await prisma.cliente.update({
    where: { id },
    data: {
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email || null,
      telefono: data.telefono || null,
      direccion: data.direccion || null,
      tipo: data.tipo,
      precioParticular: data.precioParticular ? Number(data.precioParticular) : null,
      listaPrecioId: data.listaPrecioId ?? null,
    },
  });

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  redirect(`/clientes/${id}`);
}

export async function agregarComentario(clienteId: string, texto: string) {
  if (!texto.trim()) throw new Error("El comentario no puede estar vacío");

  const usuario = await getCurrentUsuario();

  await prisma.comentario.create({
    data: {
      clienteId,
      usuarioId: usuario.id,
      texto: texto.trim(),
    },
  });

  revalidatePath(`/clientes/${clienteId}`);
}
