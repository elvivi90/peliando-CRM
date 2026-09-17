import { prisma } from "@/lib/prisma";

export function saldoConcesion(concesion: {
  cantidadEntregada: number;
  liquidaciones: { cantidadVendida: number }[];
  devoluciones: { cantidad: number }[];
}) {
  const liquidado = concesion.liquidaciones.reduce((s, l) => s + l.cantidadVendida, 0);
  const devuelto = concesion.devoluciones.reduce((s, d) => s + d.cantidad, 0);
  return concesion.cantidadEntregada - liquidado - devuelto;
}

export async function getConcesionesConSaldo() {
  const concesiones = await prisma.concesion.findMany({
    include: { cliente: true, producto: true, liquidaciones: true, devoluciones: true },
    orderBy: { fechaEntrega: "desc" },
  });

  return concesiones.map((c) => ({ ...c, saldo: saldoConcesion(c) }));
}
