"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUsuario } from "@/lib/auth";
import { saldoConcesion } from "@/lib/services/concesion";
import { parseFechaInput } from "@/lib/date";

const entregaSchema = z.object({
  clienteId: z.string().min(1, "Elegí un cliente"),
  productoId: z.string().min(1, "Elegí un producto"),
  cantidadEntregada: z.coerce.number().int().positive("La cantidad debe ser mayor a 0"),
  fecha: z.string().min(1),
});

export async function crearEntregaConcesion(input: {
  clienteId: string;
  productoId: string;
  cantidadEntregada: string;
  fecha: string;
}) {
  const data = entregaSchema.parse(input);

  const cliente = await prisma.cliente.findUniqueOrThrow({ where: { id: data.clienteId } });
  if (cliente.tipo !== "MAYORISTA") {
    throw new Error("Solo se puede cargar una entrega en concesión a un cliente mayorista.");
  }

  const producto = await prisma.producto.findUniqueOrThrow({ where: { id: data.productoId } });
  if (producto.stockActual < data.cantidadEntregada) {
    throw new Error(`Stock insuficiente de "${producto.nombre}" (disponible: ${producto.stockActual}).`);
  }

  await prisma.$transaction([
    prisma.concesion.create({
      data: {
        clienteId: data.clienteId,
        productoId: data.productoId,
        cantidadEntregada: data.cantidadEntregada,
        fechaEntrega: parseFechaInput(data.fecha),
      },
    }),
    prisma.producto.update({
      where: { id: data.productoId },
      data: { stockActual: { decrement: data.cantidadEntregada } },
    }),
  ]);

  revalidatePath("/concesion");
  revalidatePath("/productos");
  revalidatePath(`/clientes/${data.clienteId}`);
}

const liquidacionSchema = z.object({
  concesionId: z.string().min(1),
  cantidadVendida: z.coerce.number().int().positive("La cantidad debe ser mayor a 0"),
  montoCobrado: z.coerce.number().min(0),
  fecha: z.string().min(1),
});

export async function crearLiquidacion(input: {
  concesionId: string;
  cantidadVendida: string;
  montoCobrado: string;
  fecha: string;
}) {
  const data = liquidacionSchema.parse(input);
  const usuario = await getCurrentUsuario();

  const concesion = await prisma.concesion.findUniqueOrThrow({
    where: { id: data.concesionId },
    include: { liquidaciones: true, devoluciones: true, cliente: true, producto: true },
  });

  const saldo = saldoConcesion(concesion);
  if (data.cantidadVendida > saldo) {
    throw new Error(`Solo quedan ${saldo} unidades en concesión sin liquidar ni devolver.`);
  }

  await prisma.$transaction(async (tx) => {
    const venta = await tx.venta.create({
      data: {
        clienteId: concesion.clienteId,
        productoId: concesion.productoId,
        usuarioId: usuario.id,
        tipo: "CONCESION",
        cantidad: data.cantidadVendida,
        cantidadEntregada: data.cantidadVendida,
        precioUnitario: data.cantidadVendida > 0 ? data.montoCobrado / data.cantidadVendida : 0,
        precioTotal: data.montoCobrado,
        montoCobrado: data.montoCobrado,
        origen: "MANUAL",
        fecha: parseFechaInput(data.fecha),
        descripcion: `Liquidación de concesión (${concesion.producto.nombre})`,
      },
    });

    await tx.liquidacionConcesion.create({
      data: {
        concesionId: data.concesionId,
        cantidadVendida: data.cantidadVendida,
        montoCobrado: data.montoCobrado,
        fecha: parseFechaInput(data.fecha),
        ventaId: venta.id,
      },
    });
  });

  revalidatePath("/concesion");
  revalidatePath("/ventas");
  revalidatePath("/dashboard");
  revalidatePath(`/clientes/${concesion.clienteId}`);
}

const devolucionSchema = z.object({
  concesionId: z.string().min(1),
  cantidad: z.coerce.number().int().positive("La cantidad debe ser mayor a 0"),
  fecha: z.string().min(1),
});

export async function crearDevolucion(input: {
  concesionId: string;
  cantidad: string;
  fecha: string;
}) {
  const data = devolucionSchema.parse(input);

  const concesion = await prisma.concesion.findUniqueOrThrow({
    where: { id: data.concesionId },
    include: { liquidaciones: true, devoluciones: true },
  });

  const saldo = saldoConcesion(concesion);
  if (data.cantidad > saldo) {
    throw new Error(`Solo quedan ${saldo} unidades en concesión sin liquidar ni devolver.`);
  }

  await prisma.$transaction([
    prisma.devolucionConcesion.create({
      data: {
        concesionId: data.concesionId,
        cantidad: data.cantidad,
        fecha: parseFechaInput(data.fecha),
      },
    }),
    prisma.producto.update({
      where: { id: concesion.productoId },
      data: { stockActual: { increment: data.cantidad } },
    }),
  ]);

  revalidatePath("/concesion");
  revalidatePath("/productos");
  revalidatePath(`/clientes/${concesion.clienteId}`);
}
