"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUsuario, requireAdminPrincipal } from "@/lib/auth";
import { clienteSchema, type ClienteInput } from "@/lib/validation/cliente";

export async function crearCliente(input: ClienteInput) {
  const data = clienteSchema.parse(input);

  const cliente = await prisma.cliente.create({
    data: {
      nombreNegocio: data.tipo === "MINORISTA" ? null : (data.nombreNegocio ?? null),
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email || null,
      telefono: data.telefono || null,
      direccion: data.direccion || null,
      tipo: data.tipo,
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
      nombreNegocio: data.tipo === "MINORISTA" ? null : (data.nombreNegocio ?? null),
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email || null,
      telefono: data.telefono || null,
      direccion: data.direccion || null,
      tipo: data.tipo,
      // La lista es siempre la activa y no hay precio propio por cliente:
      // se limpia lo que haya quedado de antes (ver lib/pricing.ts).
      precioParticular: null,
      listaPrecioId: null,
    },
  });

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  redirect(`/clientes/${id}`);
}

// Solo el admin principal (ver lib/auth.ts). clientes_clienteId_fkey en
// ventas y concesiones es RESTRICT: si el cliente tiene ventas o
// concesiones, Postgres rechaza el delete — se traduce a un mensaje claro
// en vez de dejar pasar el error crudo de Prisma.
export async function eliminarCliente(id: string) {
  await requireAdminPrincipal();

  try {
    await prisma.cliente.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      throw new Error(
        "Este cliente tiene ventas o concesiones asociadas: no se puede eliminar mientras existan.",
      );
    }
    throw err;
  }

  revalidatePath("/clientes");
  redirect("/clientes");
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
  nombreNegocio: z.string().trim().min(1, "Ingresá el nombre del negocio"),
  // Contacto opcional: puede venir vacio.
  nombreCompleto: z.string().trim().optional().default(""),
  tipo: z.enum(["MAYORISTA", "DISTRIBUIDOR"]),
});

// Alta desde el modal de Nueva venta: devuelve el cliente sin redirigir para
// que la venta en curso siga donde estaba.
export async function crearClienteRapido(input: {
  nombreNegocio: string;
  nombreCompleto: string;
  tipo: "MAYORISTA" | "DISTRIBUIDOR";
}) {
  const data = clienteRapidoSchema.parse(input);

  // El contacto se pide en un solo campo; el modelo guarda nombre y apellido:
  // se corta en el ultimo espacio ("Juan Carlos Pérez" -> "Juan Carlos" / "Pérez").
  const partes = data.nombreCompleto ? data.nombreCompleto.split(/\s+/) : [];
  const apellido = partes.length > 1 ? partes.pop()! : "";
  const nombre = partes.join(" ");

  const cliente = await prisma.cliente.create({
    data: {
      nombreNegocio: data.nombreNegocio,
      nombre,
      apellido,
      tipo: data.tipo,
    },
    select: { id: true, nombreNegocio: true, nombre: true, apellido: true, tipo: true },
  });

  revalidatePath("/clientes");
  return cliente;
}

const clienteMinoristaRapidoSchema = z.object({
  nombre: z.string().trim().min(1, "Ingresá el nombre"),
  apellido: z.string().trim().optional().default(""),
});

// Alta desde la venta rapida: el comprador minorista es opcional, pero si se
// carga queda como cliente (con su historial de compras, igual que los que
// crea el webhook de Tiendup). Devuelve el cliente sin redirigir.
export async function crearClienteMinoristaRapido(input: { nombre: string; apellido: string }) {
  const data = clienteMinoristaRapidoSchema.parse(input);

  const cliente = await prisma.cliente.create({
    data: { nombre: data.nombre, apellido: data.apellido, tipo: "MINORISTA" },
    select: { id: true, nombreNegocio: true, nombre: true, apellido: true, tipo: true },
  });

  revalidatePath("/clientes");
  return cliente;
}
