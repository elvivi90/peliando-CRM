"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
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

const clienteRapidoSchema = z.object({
  nombreCompleto: z.string().trim().min(1, "Ingresá el nombre del cliente"),
  tipo: z.enum(["MAYORISTA", "DISTRIBUIDOR"]),
  precioParticular: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? Number(v) : undefined))
    .refine((v) => v === undefined || (Number.isFinite(v) && v >= 0), "Precio inválido"),
});

// Alta desde el modal de Nueva venta: devuelve el cliente sin redirigir para
// que la venta en curso siga donde estaba.
export async function crearClienteRapido(input: {
  nombreCompleto: string;
  tipo: "MAYORISTA" | "DISTRIBUIDOR";
  precioParticular?: string;
}) {
  const data = clienteRapidoSchema.parse(input);

  // El formulario pide un solo campo; el modelo guarda nombre y apellido:
  // se corta en el ultimo espacio ("La Plata Lúdica" -> "La Plata" / "Lúdica").
  const partes = data.nombreCompleto.split(/\s+/);
  const apellido = partes.length > 1 ? partes.pop()! : "";
  const nombre = partes.join(" ");

  const cliente = await prisma.cliente.create({
    data: {
      nombre,
      apellido,
      tipo: data.tipo,
      // El distribuidor siempre usa la formula del tramo (-20%), sin precio propio.
      precioParticular:
        data.tipo === "MAYORISTA" && data.precioParticular !== undefined
          ? data.precioParticular
          : null,
    },
    select: { id: true, nombre: true, apellido: true, tipo: true },
  });

  revalidatePath("/clientes");
  return cliente;
}
