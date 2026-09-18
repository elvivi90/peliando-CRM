"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV } from "./nav-items";
import { LogoutButton } from "./logout-button";

export function DesktopHeader({ usuarioNombre }: { usuarioNombre: string }) {
  const pathname = usePathname();

  return (
    <header className="hidden lg:flex items-center justify-between gap-4 px-8 py-[18px] bg-tarjeta border-b-[3px] border-navy">
      <div className="flex items-center gap-3.5 flex-none">
        <div className="w-[52px] h-[52px] rounded-2xl border-[3px] border-navy overflow-hidden flex-none">
          <Image
            src="/logo-peliando.png"
            alt="Peliando"
            width={52}
            height={52}
            className="w-full h-full object-cover"
            priority
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-extrabold tracking-[.1em] uppercase">CRM</span>
          <span className="text-xs text-navy/60">Peliando</span>
        </div>
      </div>

      <nav className="flex items-center gap-1 flex-wrap justify-center">
        {PRIMARY_NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? "px-4 py-2.5 rounded-xl bg-tarjeta border-2 border-navy text-sm font-extrabold"
                  : "px-4 py-2.5 rounded-xl text-sm font-bold opacity-55 hover:opacity-100 transition-opacity"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3 flex-none">
        <span className="hidden xl:inline text-xs font-semibold text-navy/60 max-w-[140px] truncate">
          {usuarioNombre}
        </span>
        <Link href="/ventas/nueva" className="btn-primary text-sm">
          + Nueva venta
        </Link>
        <LogoutButton />
      </div>
    </header>
  );
}
