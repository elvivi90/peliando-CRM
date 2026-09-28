import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
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

type VentaPeriodo = { precioTotal: Prisma.Decimal; costoEnvio: Prisma.Decimal; cantidad: number };
type GastoPeriodo = { monto: Prisma.Decimal };

// Totales de un conjunto de ventas y gastos (operativos) de un periodo.
// Gastos = gastos operativos + lo que costo enviar esas ventas
// (Venta.costoEnvio, lo paga Peliando). La inversion de capital nunca entra
// (ver getResumenInversion).
function totales(ventas: VentaPeriodo[], gastos: GastoPeriodo[]) {
  const totalVentas = ventas.reduce((s, v) => s.plus(v.precioTotal), new Prisma.Decimal(0));
  const totalEnvios = ventas.reduce((s, v) => s.plus(v.costoEnvio), new Prisma.Decimal(0));
  const totalGastos = gastos
    .reduce((s, g) => s.plus(g.monto), new Prisma.Decimal(0))
    .plus(totalEnvios);
  return {
    totalVentas,
    totalGastos,
    totalEnvios,
    neto: totalVentas.minus(totalGastos),
    unidadesVendidas: ventas.reduce((s, v) => s + v.cantidad, 0),
    cantidadVentas: ventas.length,
  };
}

async function resumirPeriodo(inicio: Date, fin: Date) {
  const [ventas, gastos] = await Promise.all([
    prisma.venta.findMany({ where: { fecha: { gte: inicio, lte: fin } } }),
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

  return { ventas, gastos, resumen: { ...totales(ventas, gastos), totalPorTipo } };
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

// Margen por unidad de un periodo (mes o año): precio promedio cobrado por
// unidad en ese periodo
// (todas las ventas: minorista, mayorista, distribuidor y concesion) menos
// el costo unitario promedio historico de produccion.
export function margenReal(
  resumenMes: { totalVentas: Prisma.Decimal; unidadesVendidas: number },
  costoUnitarioPromedio: Prisma.Decimal | null,
) {
  if (!costoUnitarioPromedio || resumenMes.unidadesVendidas === 0) return null;
  return resumenMes.totalVentas.div(resumenMes.unidadesVendidas).minus(costoUnitarioPromedio);
}
