"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUsuario } from "@/lib/auth";
import { sugerirPrecio, PricingError } from "@/lib/pricing";
import { parseFechaInput } from "@/lib/date";
import { ventaSchema, type VentaInput } from "@/lib/validation/venta";
import type { TipoVenta } from "@prisma/client";

export async function crearVenta(input: VentaInput) {
  const data = ventaSchema.parse(input);

  if (data.cantidadEntregada > data.cantidad) {
    throw new Error("La cantidad entregada no puede ser mayor a la cantidad vendida.");
  }

  const usuario = await getCurrentUsuario();

  const cliente = await prisma.cliente.findUniqueOrThrow({ where: { id: data.clienteId } });

  const producto = await prisma.producto.findUniqueOrThrow({ where: { id: data.productoId } });
  if (producto.stockActual < data.cantidad) {
    throw new Error(
      `Stock insuficiente de "${producto.nombre}" (disponible: ${producto.stockActual}).`,
    );
  }

  const tipo = cliente.tipo as TipoVenta;

  let sugerencia;
  try {
    sugerencia = await sugerirPrecio({
      tipo,
      cantidad: data.cantidad,
      clientePrecioParticular: cliente.precioParticular,
      clienteListaPrecioId: cliente.listaPrecioId,
    });
  } catch (err) {
    if (err instanceof PricingError) throw new Error(err.message);
    throw err;
  }

  // Distribuidor: la formula (tramo - 20%) es obligatoria, no admite override manual.
  const permiteManual = tipo !== "DISTRIBUIDOR";
  const precioUnitario =
    permiteManual && data.precioUnitarioManual !== undefined
      ? data.precioUnitarioManual
      : sugerencia.precioUnitario.toNumber();
  const precioTotal = precioUnitario * data.cantidad;

  if (data.montoCobrado > precioTotal) {
    throw new Error("El monto cobrado no puede ser mayor al precio total.");
  }

  const venta = await prisma.$transaction(async (tx) => {
    const nuevaVenta = await tx.venta.create({
      data: {
        clienteId: data.clienteId,
        productoId: data.productoId,
        usuarioId: usuario.id,
        eventoId: data.eventoId ?? null,
        tipo,
        listaId: sugerencia.listaId,
        tramoId: sugerencia.tramoId,
        cantidad: data.cantidad,
        cantidadEntregada: data.cantidadEntregada,
        precioUnitario,
        precioTotal,
        montoCobrado: data.montoCobrado,
        descripcion: data.descripcion ?? null,
        origen: "MANUAL",
        fecha: data.fecha,
      },
    });

    if (data.cantidadEntregada > 0) {
      await tx.entrega.create({
        data: {
          ventaId: nuevaVenta.id,
          cantidad: data.cantidadEntregada,
          fecha: data.fecha,
        },
      });
    }

    await tx.producto.update({
      where: { id: data.productoId },
      data: { stockActual: { decrement: data.cantidad } },
    });

    return nuevaVenta;
  });

  revalidatePath("/ventas");
  revalidatePath("/dashboard");
  revalidatePath(`/clientes/${data.clienteId}`);
  redirect(`/ventas/${venta.id}`);
}

export async function previsualizarPrecio(clienteId: string, cantidad: number) {
  if (!clienteId || !cantidad || cantidad <= 0) return null;

  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
  if (!cliente) return null;

  try {
    const sugerencia = await sugerirPrecio({
      tipo: cliente.tipo as TipoVenta,
      cantidad,
      clientePrecioParticular: cliente.precioParticular,
      clienteListaPrecioId: cliente.listaPrecioId,
    });
    return {
      tipo: cliente.tipo,
      precioUnitario: sugerencia.precioUnitario.toNumber(),
      precioTotal: sugerencia.precioTotal.toNumber(),
      editable: cliente.tipo !== "DISTRIBUIDOR",
    };
  } catch {
    return null;
  }
}

export async function registrarEntrega(ventaId: string, cantidad: number, fecha?: string) {
  if (cantidad <= 0) throw new Error("La cantidad debe ser mayor a 0");

  const venta = await prisma.venta.findUniqueOrThrow({ where: { id: ventaId } });
  const restante = venta.cantidad - venta.cantidadEntregada;
  if (cantidad > restante) {
    throw new Error(`Solo quedan ${restante} unidades pendientes de entrega.`);
  }

  await prisma.$transaction([
    prisma.entrega.create({
      data: { ventaId, cantidad, fecha: fecha ? parseFechaInput(fecha) : new Date() },
    }),
    prisma.venta.update({
      where: { id: ventaId },
      data: { cantidadEntregada: { increment: cantidad } },
    }),
  ]);

  revalidatePath(`/ventas/${ventaId}`);
  revalidatePath("/ventas");
  revalidatePath(`/clientes/${venta.clienteId}`);
}

export async function registrarCobro(ventaId: string, monto: number) {
  if (monto <= 0) throw new Error("El monto debe ser mayor a 0");

  const venta = await prisma.venta.findUniqueOrThrow({ where: { id: ventaId } });
  const restante = venta.precioTotal.minus(venta.montoCobrado);
  if (monto > restante.toNumber()) {
    throw new Error(`Solo restan ${restante.toString()} pendientes de cobro.`);
  }

  await prisma.venta.update({
    where: { id: ventaId },
    data: { montoCobrado: { increment: monto } },
  });

  revalidatePath(`/ventas/${ventaId}`);
  revalidatePath("/ventas");
  revalidatePath(`/clientes/${venta.clienteId}`);
}
