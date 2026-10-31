import { prisma } from "@/lib/prisma";
import { Prisma, type FormaPago } from "@prisma/client";
import {
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  format,
  subMonths,
  startOfDay,
} from "date-fns";
import { es } from "date-fns/locale";
import { costoCobro } from "@/lib/services/pagos-mercadopago";

type VentaPeriodo = {
  precioTotal: Prisma.Decimal;
  costoEnvio: Prisma.Decimal;
  cantidad: number;
  formaPago: FormaPago | null;
  pagoMercadoPago:
    | (NonNullable<Parameters<typeof costoCobro>[0]> & {
        neto: Prisma.Decimal;
        fechaLiberacion: Date | null;
        tipoMedio: string;
        cuotas: number;
      })
    | null;
};
type GastoPeriodo = { monto: Prisma.Decimal };

// Totales de un conjunto de ventas y gastos (operativos) de un periodo.
// Gastos = gastos operativos + lo que costo enviar esas ventas
// (Venta.costoEnvio, lo paga Peliando) + lo que se llevo Mercado Pago al
// cobrarlas (comision y cuotas, ver costoCobro). La inversion de capital
// nunca entra (ver getResumenInversion).
function totales(ventas: VentaPeriodo[], gastos: GastoPeriodo[]) {
  const totalVentas = ventas.reduce((s, v) => s.plus(v.precioTotal), new Prisma.Decimal(0));
  const totalEnvios = ventas.reduce((s, v) => s.plus(v.costoEnvio), new Prisma.Decimal(0));
  const totalComisiones = ventas.reduce(
    (s, v) => s.plus(costoCobro(v.pagoMercadoPago)),
    new Prisma.Decimal(0),
  );
  const totalGastos = gastos
    .reduce((s, g) => s.plus(g.monto), new Prisma.Decimal(0))
    .plus(totalEnvios)
    .plus(totalComisiones);

  // El resultado neto partido en lo que ya se puede usar y lo que sigue
  // retenido: a liberar es el neto de Mercado Pago de las ventas del periodo
  // que todavia no se libero; disponible, todo el resto (resultado neto menos
  // a liberar), asi que siempre suman el resultado neto.
  const ahora = new Date();
  let aLiberar = new Prisma.Decimal(0);
  for (const { pagoMercadoPago: p } of ventas) {
    if (p && p.estado === "approved" && p.fechaLiberacion && p.fechaLiberacion > ahora) {
      aLiberar = aLiberar.plus(p.neto);
    }
  }
  const neto = totalVentas.minus(totalGastos);

  return {
    totalVentas,
    totalGastos,
    totalEnvios,
    totalComisiones,
    disponible: neto.minus(aLiberar),
    aLiberar,
    neto,
    unidadesVendidas: ventas.reduce((s, v) => s + v.cantidad, 0),
    cantidadVentas: ventas.length,
  };
}

async function resumirPeriodo(inicio: Date, fin: Date) {
  const [ventas, gastos] = await Promise.all([
    prisma.venta.findMany({
      where: { fecha: { gte: inicio, lte: fin } },
      include: { pagoMercadoPago: true },
    }),
    prisma.gasto.findMany({ where: { tipo: "OPERATIVO", fecha: { gte: inicio, lte: fin } } }),
  ]);

  const totalPorTipo = {
    MINORISTA: new Prisma.Decimal(0),
    MAYORISTA: new Prisma.Decimal(0),
    DISTRIBUIDOR: new Prisma.Decimal(0),
    CONCESION: new Prisma.Decimal(0),
  };
  for (const v of ventas) {
    totalPorTipo[v.tipo] = totalPorTipo[v.tipo].plus(v.precioTotal);
  }

  return {
    ventas,
    gastos,
    resumen: { ...totales(ventas, gastos), totalPorTipo, mediosPago: distribucionMedios(ventas) },
  };
}

export async function getResumenMes(anio: number, mes: number) {
  const inicio = startOfMonth(new Date(anio, mes - 1, 1));
  const fin = endOfMonth(inicio);
  const { ventas, resumen } = await resumirPeriodo(inicio, fin);

  const dias = eachDayOfInterval({ start: inicio, end: fin });
  const ventasPorDia = dias.map((dia) => {
    const key = format(dia, "yyyy-MM-dd");
    const totalDia = ventas
      .filter((v) => format(startOfDay(v.fecha), "yyyy-MM-dd") === key)
      .reduce((s, v) => s.plus(v.precioTotal), new Prisma.Decimal(0));
    return { dia: format(dia, "dd/MM"), total: totalDia.toNumber() };
  });

  return { ...resumen, ventasPorDia };
}

// Reporte anual: los mismos totales sobre el año entero y el detalle mes a
// mes (para el grafico y la tabla), calculado sobre una sola consulta.
export async function getResumenAnio(anio: number) {
  const inicio = startOfYear(new Date(anio, 0, 1));
  const fin = endOfYear(inicio);
  const { ventas, gastos, resumen } = await resumirPeriodo(inicio, fin);

  const porMes = Array.from({ length: 12 }, (_, mes) => {
    const delMes = totales(
      ventas.filter((v) => v.fecha.getMonth() === mes),
      gastos.filter((g) => g.fecha.getMonth() === mes),
    );
    return {
      mes: format(new Date(anio, mes, 1), "MMM", { locale: es }),
      ventas: delMes.totalVentas.toNumber(),
      gastos: delMes.totalGastos.toNumber(),
      neto: delMes.neto.toNumber(),
      unidades: delMes.unidadesVendidas,
    };
  });

  return { ...resumen, porMes };
}

// Años para el selector: desde la primera venta hasta el actual.
export async function getAniosConVentas() {
  const primera = await prisma.venta.findFirst({ orderBy: { fecha: "asc" }, select: { fecha: true } });
  const actual = new Date().getFullYear();
  const desde = Math.min(primera?.fecha.getFullYear() ?? actual, actual);
  return Array.from({ length: actual - desde + 1 }, (_, i) => desde + i);
}

export async function getComparacionMeses(cantidadMeses = 6) {
  const ahora = new Date();
  const meses = Array.from({ length: cantidadMeses }, (_, i) =>
    subMonths(startOfMonth(ahora), cantidadMeses - 1 - i),
  );

  const resultados = await Promise.all(
    meses.map(async (m) => {
      const resumen = await getResumenMes(m.getFullYear(), m.getMonth() + 1);
      return {
        mes: format(m, "MMM yy", { locale: es }),
        ventas: resumen.totalVentas.toNumber(),
        gastos: resumen.totalGastos.toNumber(),
        neto: resumen.neto.toNumber(),
      };
    }),
  );

  return resultados;
}

// Historico, sin filtro de mes: una tirada de cajas se paga una vez y se
// vende durante muchos meses. El costo unitario promedio pondera por unidades
// (total invertido / total de unidades), asi una tirada grande pesa mas que
// una chica.
export async function getResumenInversion() {
  const [inversion, produccion] = await Promise.all([
    prisma.gasto.aggregate({ where: { tipo: "INVERSION" }, _sum: { monto: true } }),
    prisma.gasto.aggregate({
      where: { tipo: "INVERSION", unidadesGeneradas: { not: null } },
      _sum: { monto: true, unidadesGeneradas: true },
    }),
  ]);

  const unidadesProducidas = produccion._sum.unidadesGeneradas ?? 0;
  const costoUnitarioPromedio =
    unidadesProducidas > 0
      ? (produccion._sum.monto ?? new Prisma.Decimal(0)).div(unidadesProducidas)
      : null;

  return {
    inversionAcumulada: inversion._sum.monto ?? new Prisma.Decimal(0),
    costoUnitarioPromedio,
  };
}

/**
 * Margen promedio por unidad de un periodo (mes o año), con lo que cuesta
 * cada venta ademas de producirla: precio promedio cobrado por unidad (todas
 * las ventas: minorista, mayorista, distribuidor y concesion) menos el costo
 * unitario promedio historico de produccion, el envio y lo que se lleva
 * Mercado Pago (comision y cuotas), repartidos por unidad. Los gastos
 * operativos no entran: no dependen de cuantas unidades se venden (estan en
 * el resultado neto).
 */
export function margenReal(
  resumen: {
    totalVentas: Prisma.Decimal;
    totalEnvios: Prisma.Decimal;
    totalComisiones: Prisma.Decimal;
    unidadesVendidas: number;
  },
  costoUnitarioPromedio: Prisma.Decimal | null,
) {
  if (!costoUnitarioPromedio || resumen.unidadesVendidas === 0) return null;
  const u = resumen.unidadesVendidas;
  const precio = resumen.totalVentas.div(u);
  const envio = resumen.totalEnvios.div(u);
  const mercadoPago = resumen.totalComisiones.div(u);
  const margen = precio.minus(costoUnitarioPromedio).minus(envio).minus(mercadoPago);
  return {
    precio,
    produccion: costoUnitarioPromedio,
    envio,
    mercadoPago,
    margen,
    // Sobre el precio promedio: que parte de cada venta le queda a Peliando.
    porcentaje: precio.gt(0) ? margen.div(precio).times(100) : null,
  };
}

// Medios de pago del grafico de Reportes, en el orden fijo de sus colores.
export const MEDIOS_REPORTE = [
  "Tarjeta en cuotas",
  "Tarjeta en 1 pago",
  "Dinero en cuenta",
  "Transferencia",
  "Efectivo",
  "Posnet",
  "Sin especificar",
] as const;
export type MedioReporte = (typeof MEDIOS_REPORTE)[number];

const MEDIO_DE_FORMA_PAGO: Record<FormaPago, MedioReporte> = {
  TRANSFERENCIA: "Transferencia",
  EFECTIVO: "Efectivo",
  POSNET: "Posnet",
};

// Medio de una venta: el del cobro de Mercado Pago si lo tiene (ventas de
// Tiendup), si no la forma de pago cargada (o la transferencia de Tiendup).
function medioDeVenta(v: Pick<VentaPeriodo, "formaPago" | "pagoMercadoPago">): MedioReporte {
  const p = v.pagoMercadoPago;
  if (p) {
    if (p.tipoMedio === "account_money") return "Dinero en cuenta";
    if (p.tipoMedio === "credit_card" && p.cuotas > 1) return "Tarjeta en cuotas";
    return "Tarjeta en 1 pago";
  }
  return v.formaPago ? MEDIO_DE_FORMA_PAGO[v.formaPago] : "Sin especificar";
}

/** Cuantas ventas y cuanta plata (precio de venta) entraron por cada medio. */
function distribucionMedios(ventas: Pick<VentaPeriodo, "formaPago" | "pagoMercadoPago" | "precioTotal">[]) {
  const porMedio = new Map<MedioReporte, { ventas: number; monto: Prisma.Decimal }>();
  for (const v of ventas) {
    const medio = medioDeVenta(v);
    const actual = porMedio.get(medio) ?? { ventas: 0, monto: new Prisma.Decimal(0) };
    actual.ventas++;
    actual.monto = actual.monto.plus(v.precioTotal);
    porMedio.set(medio, actual);
  }
  return MEDIOS_REPORTE.filter((m) => porMedio.has(m)).map((medio) => ({
    medio,
    ventas: porMedio.get(medio)!.ventas,
    monto: porMedio.get(medio)!.monto.toNumber(),
  }));
}
