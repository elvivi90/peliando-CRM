import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { GastoForm } from "@/components/gastos/gasto-form";
import { fechaInputValue } from "@/lib/date";

export default async function EditarGastoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [gasto, eventos] = await Promise.all([
    prisma.gasto.findUnique({ where: { id }, include: { evento: true } }),
    prisma.evento.findMany({
      orderBy: { fecha: "desc" },
      take: 30,
      select: { id: true, nombre: true },
    }),
  ]);

  if (!gasto) notFound();

  // El evento del gasto puede ser mas viejo que los 30 recientes: sin esto
  // el select lo mostraria como "Sin evento" y guardar lo desvincularia.
  if (gasto.evento && !eventos.some((e) => e.id === gasto.evento!.id)) {
    eventos.push({ id: gasto.evento.id, nombre: gasto.evento.nombre });
  }

  return (
    <div>
      <PageHeader title="Editar gasto" />
      <GastoForm
        eventos={eventos}
        gastoId={gasto.id}
        defaultValues={{
          tipo: gasto.tipo,
          categoria: gasto.categoria,
          concepto: gasto.concepto,
          monto: gasto.monto.toString(),
          fecha: fechaInputValue(gasto.fecha),
          eventoId: gasto.eventoId ?? "",
          unidadesGeneradas: gasto.unidadesGeneradas?.toString() ?? "",
        }}
      />
    </div>
  );
}
