"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUsuario, requireAdminPrincipal } from "@/lib/auth";
import { sugerirPrecio, elegirTramo, precioDeTramo, PricingError } from "@/lib/pricing";
import { parseFechaInput } from "@/lib/date";
import { formatMoney, nombreCliente } from "@/lib/format";
import { enviarNotificacion } from "@/lib/services/notificaciones";
import { ventaSchema, esVentaEditable, type VentaInput } from "@/lib/validation/venta";
import type { TipoVenta } from "@prisma/client";

type VentaData = ReturnType<typeof ventaSchema.parse>;
type ClienteVenta = Awaited<ReturnType<typeof prisma.cliente.findUniqueOrThrow>>;

// Sin cliente = venta rapida: minorista al PVP de la lista activa.
async function buscarCliente(clienteId: string | undefined) {
  return clienteId ? prisma.cliente.findUniqueOrThrow({ where: { id: clienteId } }) : null;
}

// Precio segun la lista (ver lib/pricing.ts), con el override manual si el
// tipo lo permite. Comun a crear y editar.
async function calcularPrecio(data: VentaData, cliente: ClienteVenta | null) {
  const tipo: TipoVenta = cliente ? cliente.tipo : "MINORISTA";

  let sugerencia;
  try {
    sugerencia = await sugerirPrecio({
      tipo,
      cantidad: data.cantidad,
      clientePrecioParticular: cliente?.precioParticular,
      clienteListaPrecioId: cliente?.listaPrecioId,
      tramoId: data.tramoId,
    });
  } catch (err) {
    if (err instanceof PricingError) throw new Error(err.message);
    throw err;
  }

  // Distribuidor: la formula (tramo - 20%) es obligatoria, no admite override manual.
  const precioUnitario =
    tipo !== "DISTRIBUIDOR" && data.precioUnitarioManual !== undefined
      ? data.precioUnitarioManual
      : sugerencia.precioUnitario.toNumber();

  return { tipo, listaId: sugerencia.listaId, tramoId: sugerencia.tramoId, precioUnitario };
}

export async function crearVenta(input: VentaInput) {
  const data = ventaSchema.parse(input);

  if (data.cantidadEntregada > data.cantidad) {
    throw new Error("La cantidad entregada no puede ser mayor a la cantidad vendida.");
  }

  const usuario = await getCurrentUsuario();
  const cliente = await buscarCliente(data.clienteId);

  const producto = await prisma.producto.findUniqueOrThrow({ where: { id: data.productoId } });
  if (producto.stockActual < data.cantidad) {
    throw new Error(
      `Stock insuficiente de "${producto.nombre}" (disponible: ${producto.stockActual}).`,
    );
  }

  const { tipo, listaId, tramoId, precioUnitario } = await calcularPrecio(data, cliente);
  const precioTotal = precioUnitario * data.cantidad;

  if (data.montoCobrado > precioTotal) {
    throw new Error("El monto cobrado no puede ser mayor al precio total.");
  }

  const venta = await prisma.$transaction(async (tx) => {
    const nuevaVenta = await tx.venta.create({
      data: {
        clienteId: data.clienteId ?? null,
        productoId: data.productoId,
        usuarioId: usuario.id,
        eventoId: data.eventoId ?? null,
        tipo,
        listaId,
        tramoId,
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

  // Al resto del equipo; quien la cargo ya sabe que la cargo.
  after(() =>
    enviarNotificacion(
      {
        titulo: `Nueva venta de ${usuario.nombre}`,
        cuerpo: `${data.cantidad} × ${producto.nombre} · ${nombreCliente(cliente)} · ${formatMoney(precioTotal)}`,
        url: `/ventas/${venta.id}`,
      },
      { excluirUsuarioId: usuario.id },
    ),
  );

  revalidatePath("/ventas");
  revalidatePath("/dashboard");
  if (data.clienteId) revalidatePath(`/clientes/${data.clienteId}`);
  redirect(`/ventas/${venta.id}`);
}

// Cualquier usuario puede editar (como gastos y clientes); solo borrar es del
// admin principal. usuarioId no se toca y editar no notifica.
//
// mantenerPrecio: el formulario lo manda si no se tocaron cliente, cantidad
// ni tramo. Entonces se conserva el precio guardado (y su lista/tramo) en vez
// de recalcularlo con la lista de hoy, que puede haber cambiado desde la
// venta. Solo se puede pisar a mano, igual que al crear.
export async function actualizarVenta(id: string, input: VentaInput, mantenerPrecio: boolean) {
  const data = ventaSchema.parse(input);
  await getCurrentUsuario();

  const anterior = await prisma.venta.findUniqueOrThrow({
    where: { id },
    include: { entregas: true },
  });
  if (!esVentaEditable(anterior)) {
    throw new Error("Las ventas de Tiendup y las de liquidación de concesión no se editan.");
  }

  const cliente = await buscarCliente(data.clienteId);
  const conservarPrecio =
    mantenerPrecio &&
    (data.clienteId ?? null) === anterior.clienteId &&
    data.cantidad === anterior.cantidad;

  const precio = conservarPrecio
    ? {
        tipo: anterior.tipo,
        listaId: anterior.listaId,
        tramoId: anterior.tramoId,
        precioUnitario:
          anterior.tipo !== "DISTRIBUIDOR" && data.precioUnitarioManual !== undefined
            ? data.precioUnitarioManual
            : anterior.precioUnitario.toNumber(),
      }
    : await calcularPrecio(data, cliente);
  const precioTotal = precio.precioUnitario * data.cantidad;

  // El formulario ya manda el total nuevo si la venta estaba cobrada entera.
  if (data.montoCobrado > precioTotal) {
    throw new Error("El monto cobrado no puede ser mayor al precio total.");
  }

  // Entregas: una venta que estaba entregada entera sigue entregada entera
  // con la cantidad nueva (el caso normal: se cargo y se entrego en el acto).
  // Si tenia una sola entrega se ajusta esa; si tenia varias y la cantidad
  // sube, se agrega una por la diferencia. Con entrega parcial se respeta lo
  // entregado: la cantidad no puede quedar por debajo.
  const estabaEntregada = anterior.cantidadEntregada === anterior.cantidad;
  const entregaUnica = anterior.entregas.length === 1 ? anterior.entregas[0] : null;
  const variasEntregas = anterior.entregas.length > 1;
  let cantidadEntregada = anterior.cantidadEntregada;
  if (estabaEntregada && (!variasEntregas || data.cantidad > anterior.cantidad)) {
    cantidadEntregada = data.cantidad;
  } else if (data.cantidad < anterior.cantidadEntregada) {
    throw new Error(
      `Ya se entregaron ${anterior.cantidadEntregada} unidades: la cantidad no puede ser menor.`,
    );
  }

  // Unidades de mas que esta edicion saca del stock del producto (nuevo).
  const consumoExtra =
    data.productoId === anterior.productoId ? data.cantidad - anterior.cantidad : data.cantidad;

  await prisma.$transaction(async (tx) => {
    await tx.producto.update({
      where: { id: anterior.productoId },
      data: { stockActual: { increment: anterior.cantidad } },
    });
    const producto = await tx.producto.update({
      where: { id: data.productoId },
      data: { stockActual: { decrement: data.cantidad } },
    });
    // Solo se frena si la edicion pide unidades que no hay. Un stock que ya
    // estaba en negativo (ver webhook de Tiendup) no impide corregir la
    // fecha o el precio de una venta.
    if (consumoExtra > 0 && producto.stockActual < 0) {
      throw new Error(
        `Stock insuficiente de "${producto.nombre}" (disponible: ${producto.stockActual + data.cantidad}).`,
      );
    }

    if (estabaEntregada && entregaUnica) {
      // La entrega que se creo junto con la venta acompaña su fecha.
      const mismaFecha = entregaUnica.fecha.getTime() === anterior.fecha.getTime();
      await tx.entrega.update({
        where: { id: entregaUnica.id },
        data: { cantidad: data.cantidad, fecha: mismaFecha ? data.fecha : undefined },
      });
    } else if (estabaEntregada && variasEntregas && data.cantidad > anterior.cantidad) {
      await tx.entrega.create({
        data: { ventaId: id, cantidad: data.cantidad - anterior.cantidad, fecha: data.fecha },
      });
    }

    await tx.venta.update({
      where: { id },
      data: {
        clienteId: data.clienteId ?? null,
        productoId: data.productoId,
        eventoId: data.eventoId ?? null,
        tipo: precio.tipo,
        listaId: precio.listaId,
        tramoId: precio.tramoId,
        cantidad: data.cantidad,
        cantidadEntregada,
        precioUnitario: precio.precioUnitario,
        precioTotal,
        montoCobrado: data.montoCobrado,
        fecha: data.fecha,
      },
    });
  });

  revalidatePath("/ventas");
  revalidatePath(`/ventas/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/reportes");
  revalidatePath("/productos");
  for (const clienteId of new Set([anterior.clienteId, data.clienteId ?? null])) {
    if (clienteId) revalidatePath(`/clientes/${clienteId}`);
  }
  for (const eventoId of new Set([anterior.eventoId, data.eventoId ?? null])) {
    if (eventoId) revalidatePath(`/eventos/${eventoId}`);
  }
  redirect(`/ventas/${id}`);
}

export type PrevisualizacionPrecio = {
  tipo: TipoVenta;
  precioUnitario: number;
  precioTotal: number;
  editable: boolean;
  // Que muestra la caja de precio: "PVP MINORISTA", "TRAMO 10 UN.", "PRECIO PARTICULAR"
  origen: "PVP" | "TRAMO" | "PARTICULAR";
  tramoDesde: number | null;
  // Tramo aplicado, el que corresponde a la cantidad (automatico) y la lista
  // completa con el precio que pagaria este cliente en cada uno.
  tramoId: string | null;
  tramoSugeridoId: string | null;
  listaNombre: string;
  tramos: { id: string; cantidadDesde: number; precioUnitario: number }[];
} | null;

// clienteId vacio = venta rapida (minorista sin cliente). tramoId fuerza un
// tramo distinto al que corresponde a la cantidad.
export async function previsualizarPrecio(
  clienteId: string | null,
  cantidad: number,
  tramoId?: string | null,
): Promise<PrevisualizacionPrecio> {
  if (!cantidad || cantidad <= 0) return null;

  const cliente = clienteId ? await prisma.cliente.findUnique({ where: { id: clienteId } }) : null;
  if (clienteId && !cliente) return null;
  const tipo: TipoVenta = cliente ? cliente.tipo : "MINORISTA";

  try {
    const sugerencia = await sugerirPrecio({
      tipo,
      cantidad,
      clientePrecioParticular: cliente?.precioParticular,
      clienteListaPrecioId: cliente?.listaPrecioId,
      tramoId,
    });
    const conTramos = tipo !== "MINORISTA";
    return {
      tipo,
      precioUnitario: sugerencia.precioUnitario.toNumber(),
      precioTotal: sugerencia.precioTotal.toNumber(),
      editable: tipo !== "DISTRIBUIDOR",
      origen:
        tipo === "MINORISTA" ? "PVP" : sugerencia.tramoDesde === null ? "PARTICULAR" : "TRAMO",
      tramoDesde: sugerencia.tramoDesde,
      tramoId: sugerencia.tramoId,
      tramoSugeridoId: conTramos ? (elegirTramo(sugerencia.tramos, cantidad)?.id ?? null) : null,
      listaNombre: sugerencia.listaNombre,
      tramos: conTramos
        ? sugerencia.tramos.map((t) => ({
            id: t.id,
            cantidadDesde: t.cantidadDesde,
            precioUnitario: precioDeTramo(tipo, t).toNumber(),
          }))
        : [],
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

// Solo el admin principal (ver lib/auth.ts). Devuelve la cantidad al stock
// del producto (simetrico a crearVenta, que lo descuenta). entregas_ventaId
// es CASCADE (se borran solas) y liquidaciones_concesion_ventaId es SET
// NULL (si esta venta vino de liquidar una concesion, la liquidacion queda
// sin venta asociada pero no se borra ni bloquea el delete).
export async function eliminarVenta(id: string) {
  await requireAdminPrincipal();

  const venta = await prisma.venta.findUniqueOrThrow({ where: { id } });

  await prisma.$transaction([
    prisma.venta.delete({ where: { id } }),
    prisma.producto.update({
      where: { id: venta.productoId },
      data: { stockActual: { increment: venta.cantidad } },
    }),
  ]);

  revalidatePath("/ventas");
  revalidatePath("/dashboard");
  revalidatePath("/productos");
  if (venta.clienteId) revalidatePath(`/clientes/${venta.clienteId}`);
  if (venta.eventoId) revalidatePath(`/eventos/${venta.eventoId}`);
  redirect("/ventas");
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
