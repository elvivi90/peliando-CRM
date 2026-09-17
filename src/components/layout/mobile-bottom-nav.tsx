"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOBILE_NAV } from "./nav-items";
import { NavIcon } from "./nav-icon";

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around bg-tarjeta border-t-[3px] border-navy px-2 pt-2.5 z-40"
      style={{ paddingBottom: "calc(0.65rem + env(safe-area-inset-bottom, 0px))" }}
    >
      {MOBILE_NAV.map((item) => {
        const active =
          item.href === "/mas"
            ? !["/dashboard", "/ventas", "/clientes"].some((h) => pathname.startsWith(h)) &&
              pathname.startsWith("/mas")
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 ${active ? "" : "opacity-50"}`}
          >
            <NavIcon icon={item.icon} />
            <span className={`text-[10px] ${active ? "font-extrabold" : "font-bold"}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
