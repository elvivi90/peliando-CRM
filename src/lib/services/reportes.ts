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
    // La inversion de capital no es gasto del mes (ver getResumenInversion).
    prisma.gasto.findMany({ where: { tipo: "OPERATIVO", fecha: { gte: inicio, lte: fin } } }),
  ]);

  const totalVentas = ventas.reduce((s, v) => s.plus(v.precioTotal), new Prisma.Decimal(0));
  // Gastos del mes = gastos operativos + lo que costo enviar las ventas del
  // mes (Venta.costoEnvio, lo paga Peliando).
  const totalEnvios = ventas.reduce((s, v) => s.plus(v.costoEnvio), new Prisma.Decimal(0));
  const totalGastos = gastos
    .reduce((s, g) => s.plus(g.monto), new Prisma.Decimal(0))
    .plus(totalEnvios);
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
    totalEnvios,
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

// Margen por unidad de un mes: precio promedio cobrado por unidad en ese mes
// (todas las ventas: minorista, mayorista, distribuidor y concesion) menos el
// costo unitario promedio historico de produccion.
export function margenReal(
  resumenMes: { totalVentas: Prisma.Decimal; unidadesVendidas: number },
  costoUnitarioPromedio: Prisma.Decimal | null,
) {
  if (!costoUnitarioPromedio || resumenMes.unidadesVendidas === 0) return null;
  return resumenMes.totalVentas.div(resumenMes.unidadesVendidas).minus(costoUnitarioPromedio);
}
