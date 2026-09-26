import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { fechaInputValue } from "@/lib/date";

/**
 * Datos para el backup diario en Google Sheets (ver scripts/backup-sheets.gs,
 * que corre dentro del Sheet y llama a esta ruta una vez por dia). Devuelve
 * una tabla por pestaña (primera fila = encabezados) y el Sheet reescribe
 * cada pestaña completa.
 *
 * Incluye datos personales de clientes: solo responde con
 * `Authorization: Bearer <BACKUP_SECRET>`. Sin la variable no responde.
 */

type Celda = string | number | null;

function autorizado(request: NextRequest) {
  const secret = process.env.BACKUP_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || !header) return false;
  const esperado = Buffer.from(`Bearer ${secret}`);
  const recibido = Buffer.from(header);
  return esperado.length === recibido.length && timingSafeEqual(esperado, recibido);
}

const num = (v: { toNumber(): number } | null | undefined) => (v ? v.toNumber() : null);
const fecha = (d: Date | null | undefined) => (d ? fechaInputValue(d) : null);
const persona = (p: { nombre: string; apellido: string } | null | undefined) =>
  p ? `${p.nombre} ${p.apellido}`.trim() : null;

export async function GET(request: NextRequest) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const [ventas, clientes, gastos, entregas] = await Promise.all([
    prisma.venta.findMany({
      orderBy: { fecha: "asc" },
      include: { cliente: true, producto: true, evento: true, usuario: true, tramo: true, lista: true },
    }),
    prisma.cliente.findMany({
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
      include: { listaPrecio: true },
    }),
    prisma.gasto.findMany({ orderBy: { fecha: "asc" }, include: { evento: true, usuario: true } }),
    prisma.entrega.findMany({
      orderBy: { fecha: "asc" },
      include: { venta: { include: { cliente: true, producto: true } } },
    }),
  ]);

  const hojas: Record<string, Celda[][]> = {
    Ventas: [
      [
        "ID", "Fecha", "Tipo", "Origen", "Orden Tiendup", "Cliente", "Producto", "Cantidad",
        "Entregada", "Precio unitario", "Precio total", "Cobrado", "Saldo", "Costo de envío",
        "Evento", "Lista de precios", "Tramo desde", "Cargada por", "Descripción",
      ],
      ...ventas.map((v) => [
        v.id,
        fecha(v.fecha),
        v.tipo,
        v.origen === "WEBHOOK_TIENDUP" ? "Tiendup" : "Manual",
        v.tiendupOrderId,
        persona(v.cliente) ?? "Venta rápida",
        v.producto.nombre,
        v.cantidad,
        v.cantidadEntregada,
        num(v.precioUnitario),
        num(v.precioTotal),
        num(v.montoCobrado),
        v.precioTotal.minus(v.montoCobrado).toNumber(),
        num(v.costoEnvio),
        v.evento?.nombre ?? null,
        v.lista?.nombre ?? null,
        v.tramo?.cantidadDesde ?? null,
        v.usuario.nombre,
        v.descripcion,
      ]),
    ],
    Clientes: [
      [
        "ID", "Nombre", "Apellido", "Tipo", "Email", "Teléfono", "Dirección",
        "Precio particular", "Lista de precios", "Alta",
      ],
      ...clientes.map((c) => [
        c.id,
        c.nombre,
        c.apellido,
        c.tipo,
        c.email,
        c.telefono,
        c.direccion,
        num(c.precioParticular),
        c.listaPrecio?.nombre ?? null,
        fecha(c.createdAt),
      ]),
    ],
    Gastos: [
      [
        "ID", "Fecha", "Tipo", "Categoría", "Concepto", "Monto", "Unidades generadas",
        "Costo unitario", "Evento", "Cargado por",
      ],
      ...gastos.map((g) => [
        g.id,
        fecha(g.fecha),
        g.tipo === "INVERSION" ? "Inversión" : "Operativo",
        g.categoria,
        g.concepto,
        num(g.monto),
        g.unidadesGeneradas,
        num(g.costoUnitario),
        g.evento?.nombre ?? null,
        g.usuario.nombre,
      ]),
    ],
    Entregas: [
      ["ID venta", "Fecha", "Cantidad", "Cliente", "Producto"],
      ...entregas.map((e) => [
        e.ventaId,
        fecha(e.fecha),
        e.cantidad,
        persona(e.venta.cliente) ?? "Venta rápida",
        e.venta.producto.nombre,
      ]),
    ],
  };

  return NextResponse.json({ generado: new Date().toISOString(), hojas });
}
