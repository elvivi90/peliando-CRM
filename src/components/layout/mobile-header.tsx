"use client";

import { LogoutButton } from "./logout-button";

export function MobileHeader() {
  return (
    <header className="lg:hidden flex items-center justify-between px-4 py-3.5 bg-tarjeta border-b-[3px] border-navy">
      <div className="flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-xl border-2 border-navy bg-amarillo flex items-center justify-center text-base font-black">
          P
        </div>
        <span className="text-xs font-extrabold tracking-[.08em] uppercase">CRM Peliando</span>
      </div>
      <LogoutButton />
    </header>
  );
}
