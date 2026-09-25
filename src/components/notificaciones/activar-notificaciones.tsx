"use client";

import { useEffect, useState, useTransition } from "react";
import {
  activarNotificaciones,
  desactivarNotificaciones,
  enviarNotificacionDePrueba,
} from "@/app/(app)/mas/actions";

type Estado =
  | "cargando"
  | "no-soportado"
  // iPhone: Web Push solo funciona con la app instalada en la pantalla de inicio.
  | "instalar-ios"
  | "bloqueado"
  | "inactivo"
  | "activo";

// La clave VAPID publica viene en base64url; pushManager.subscribe pide bytes.
function claveABytes(base64url: string) {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const binario = atob(base64);
  return Uint8Array.from(binario, (c) => c.charCodeAt(0));
}

function esIosSinInstalar() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const instalada =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !instalada;
}

export function ActivarNotificaciones() {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    async function detectar() {
      if (esIosSinInstalar()) return setEstado("instalar-ios");
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        return setEstado("no-soportado");
      }
      if (Notification.permission === "denied") return setEstado("bloqueado");
      const registro = await navigator.serviceWorker.ready;
      const suscripcion = await registro.pushManager.getSubscription();
      setEstado(suscripcion ? "activo" : "inactivo");
    }
    detectar().catch(() => setEstado("no-soportado"));
  }, []);

  function activar() {
    setError(null);
    setAviso(null);
    startTransition(async () => {
      try {
        const clave = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!clave) throw new Error("Falta configurar las notificaciones en el servidor.");

        const permiso = await Notification.requestPermission();
        if (permiso !== "granted") {
          setEstado(permiso === "denied" ? "bloqueado" : "inactivo");
          return;
        }

        const registro = await navigator.serviceWorker.ready;
        const suscripcion =
          (await registro.pushManager.getSubscription()) ??
          (await registro.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: claveABytes(clave),
          }));
        await activarNotificaciones(suscripcion.toJSON());
        setEstado("activo");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron activar las notificaciones.");
      }
    });
  }

  function desactivar() {
    setError(null);
    setAviso(null);
    startTransition(async () => {
      try {
        const registro = await navigator.serviceWorker.ready;
        const suscripcion = await registro.pushManager.getSubscription();
        if (suscripcion) {
          await desactivarNotificaciones(suscripcion.endpoint);
          await suscripcion.unsubscribe();
        }
        setEstado("inactivo");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron desactivar las notificaciones.");
      }
    });
  }

  function probar() {
    setError(null);
    startTransition(async () => {
      await enviarNotificacionDePrueba();
      setAviso("Enviada. Si no llega en unos segundos, revisá los permisos del celular.");
    });
  }

  return (
    <div className="card-chunky px-5 py-4 flex flex-col gap-3">
      <div>
        <div className="font-extrabold">Notificaciones en este celular</div>
        <p className="text-sm text-navy/60 mt-0.5">
          Ventas de Tiendup, ventas, liquidaciones de concesión y gastos que cargue otra persona
          del equipo, y un resumen de cobros pendientes los lunes.
        </p>
      </div>

      {estado === "instalar-ios" && (
        <p className="text-sm font-semibold text-navy/70">
          En iPhone primero hay que instalar la app: tocá Compartir → &quot;Agregar a inicio&quot; y
          abrila desde el ícono.
        </p>
      )}
      {estado === "no-soportado" && (
        <p className="text-sm font-semibold text-navy/70">
          Este navegador no admite notificaciones.
        </p>
      )}
      {estado === "bloqueado" && (
        <p className="text-sm font-semibold text-rosa">
          Las notificaciones están bloqueadas. Habilitalas desde los ajustes del navegador para este
          sitio y volvé a entrar.
        </p>
      )}

      {(estado === "inactivo" || estado === "activo") && (
        <div className="flex gap-2 flex-wrap">
          {estado === "inactivo" ? (
            <button type="button" onClick={activar} disabled={pending} className="btn-primary text-sm">
              {pending ? "Activando..." : "Activar notificaciones"}
            </button>
          ) : (
            <>
              <button type="button" onClick={probar} disabled={pending} className="btn-primary text-sm">
                Enviar prueba
              </button>
              <button type="button" onClick={desactivar} disabled={pending} className="btn-secondary text-sm">
                Desactivar
              </button>
            </>
          )}
        </div>
      )}

      {aviso && <p className="text-sm text-navy/70">{aviso}</p>}
      {error && <p className="text-sm font-bold text-rosa">{error}</p>}
    </div>
  );
}
