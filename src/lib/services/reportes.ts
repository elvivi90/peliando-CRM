import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  subMonths,
  startOfDay,
} from "date-fns";
import { es } from "date-fns/locale";

export async function getResumenMes(anio: number, mes: number) {
  const inicio = startOfMonth(new Date(anio, mes - 1, 1));
  const fin = endOfMonth(inicio);

  const [ventas, gastos] = await Promise.all([
    prisma.venta.findMany({ where: { fecha: { gte: inicio, lte: fin } } }),
    prisma.gasto.findMany({ where: { fecha: { gte: inicio, lte: fin } } }),
  ]);

  const totalVentas = ventas.reduce((s, v) => s.plus(v.precioTotal), new Prisma.Decimal(0));
  const totalGastos = gastos.reduce((s, g) => s.plus(g.monto), new Prisma.Decimal(0));
  const unidadesVendidas = ventas.reduce((s, v) => s + v.cantidad, 0);

  const totalPorTipo = {
    MINORISTA: new Prisma.Decimal(0),
    MAYORISTA: new Prisma.Decimal(0),
    DISTRIBUIDOR: new Prisma.Decimal(0),
    CONCESION: new Prisma.Decimal(0),
  };
  for (const v of ventas) {
    totalPorTipo[v.tipo] = totalPorTipo[v.tipo].plus(v.precioTotal);
  }

  const dias = eachDayOfInterval({ start: inicio, end: fin });
  const ventasPorDia = dias.map((dia) => {
    const key = format(dia, "yyyy-MM-dd");
    const totalDia = ventas
      .filter((v) => format(startOfDay(v.fecha), "yyyy-MM-dd") === key)
      .reduce((s, v) => s.plus(v.precioTotal), new Prisma.Decimal(0));
    return { dia: format(dia, "dd/MM"), total: totalDia.toNumber() };
  });

  return {
    totalVentas,
    totalGastos,
    neto: totalVentas.minus(totalGastos),
    unidadesVendidas,
    totalPorTipo,
    ventasPorDia,
    cantidadVentas: ventas.length,
  };
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
