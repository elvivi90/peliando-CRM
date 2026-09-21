import { getCurrentUsuario } from "@/lib/auth";
import { DesktopHeader } from "@/components/layout/desktop-header";
import { MobileHeader } from "@/components/layout/mobile-header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { FabNuevaVenta } from "@/components/layout/fab-nueva-venta";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const usuario = await getCurrentUsuario();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Baja el logo animado del indicador de carga en segundo plano, asi ya esta
          en cache cuando aparece la primera pantalla de carga. */}
      <link rel="prefetch" as="image" href="/splash/logo-cargando.webp" />
      <div className="franja-marca h-[5px] lg:hidden">
        <div className="bg-azul" />
        <div className="bg-rosa" />
        <div className="bg-amarillo" />
      </div>

      <div className="hidden lg:flex">
        <div className="w-[22px] min-h-screen fixed left-0 top-0 flex flex-col">
          <div className="flex-1 bg-azul" />
          <div className="flex-1 bg-rosa" />
          <div className="flex-1 bg-amarillo" />
        </div>
      </div>

      <div className="lg:pl-[22px] flex flex-col min-h-screen">
        <DesktopHeader usuarioNombre={usuario.nombre} />
        <MobileHeader />

        <main className="flex-1 px-4 py-5 lg:px-8 lg:py-7 pb-24 lg:pb-7">{children}</main>
      </div>

      <MobileBottomNav />
      <FabNuevaVenta />
    </div>
  );
}
