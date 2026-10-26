import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EnvioBadge } from "@/components/ui/badge";
import { BotonEliminar } from "@/components/ui/boton-eliminar";
import { FormRecarga } from "@/components/correo/form-recarga";
import { formatDate, formatMoney } from "@/lib/format";
import { getCurrentUsuario, esAdminPrincipal } from "@/lib/auth";
import { correoConfigurado } from "@/lib/services/correo-argentino";
import { saldoCorreo } from "@/lib/services/envios";
import { eliminarRecarga } from "./actions";

export default async function CorreoPage() {
  const [{ recargado, gastado, saldo }, recargas, envios, usuario] = await Promise.all([
    saldoCorreo(),
    prisma.recargaCorreo.findMany({ orderBy: { fecha: "desc" }, take: 50, include: { usuario: true } }),
    // Los que fallaron primero: son los que hay que resolver.
    prisma.envio.findMany({
      where: { estado: { not: "ENTREGADO" } },
      orderBy: [{ estado: "desc" }, { createdAt: "desc" }],
      take: 50,
    }),
    getCurrentUsuario(),
  ]);
  const puedeEliminar = esAdminPrincipal(usuario);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Correo Argentino" subtitle="Saldo de la cuenta y envíos en curso" />

      {!correoConfigurado() && (
        <p className="rounded-xl border-2 border-rosa bg-rosa/10 px-4 py-3 text-sm font-semibold text-rosa">
          Faltan las credenciales de MiCorreo: por ahora el CRM no da de alta envíos.
        </p>
      )}

      <div className="flex gap-3 flex-wrap">
        <StatCard
          label="Saldo estimado"
          value={formatMoney(saldo)}
          stripe={saldo.isNegative() ? "rosa" : "amarillo"}
          hint="Recargas menos envíos dados de alta"
          hintColor={saldo.isNegative() ? "rosa" : undefined}
        />
        <StatCard label="Recargado" value={formatMoney(recargado)} stripe="navy" />
        <StatCard label="Gastado en envíos" value={formatMoney(gastado)} stripe="azul" />
      </div>
      <p className="text-xs text-navy/55 -mt-3">
        Es una cuenta propia del CRM, no el saldo que informa Correo: si se paga un envío por fuera
        del sistema, no lo descuenta.
      </p>

      <FormRecarga />

      <div className="card-chunky p-5">
        <h2 className="font-extrabold text-sm uppercase tracking-wide text-navy/60 mb-3">
          Envíos en curso
        </h2>
        {envios.length === 0 ? (
          <p className="text-sm text-navy/60">No hay envíos pendientes.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {envios.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 text-sm border-t border-navy/10 pt-2 first:border-0 first:pt-0"
              >
                <Link href={`/ventas/${e.ventaId}`} className="min-w-0 hover:underline">
                  <span className="font-bold">{e.destinatarioNombre}</span>
                  <span className="text-navy/60">
                    {" "}
                    · {e.localidad} · {formatDate(e.createdAt)}
                  </span>
                </Link>
                <EnvioBadge estado={e.estado} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card-chunky p-5">
        <h2 className="font-extrabold text-sm uppercase tracking-wide text-navy/60 mb-3">
          Recargas
        </h2>
        {recargas.length === 0 ? (
          <p className="text-sm text-navy/60">Todavía no se registró ninguna recarga.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recargas.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 text-sm border-t border-navy/10 pt-2 first:border-0 first:pt-0"
              >
                <span>
                  {formatDate(r.fecha)} <span className="text-navy/55">· {r.usuario.nombre}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-bold">{formatMoney(r.monto)}</span>
                  {puedeEliminar && (
                    <BotonEliminar
                      entidad="esta recarga"
                      onEliminar={eliminarRecarga.bind(null, r.id)}
                      compacto
                    />
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
