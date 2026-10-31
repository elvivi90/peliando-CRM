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
import { costoCobro } from "@/lib/services/pagos-mercadopago";

type VentaPeriodo = {
  precioTotal: Prisma.Decimal;
  costoEnvio: Prisma.Decimal;
  cantidad: number;
  pagoMercadoPago:
    | (NonNullable<Parameters<typeof costoCobro>[0]> & {
        neto: Prisma.Decimal;
        fechaLiberacion: Date | null;
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
