"use client";

import Image from "next/image";
import { LogoutButton } from "./logout-button";

export function MobileHeader() {
  return (
    <header className="lg:hidden flex items-center justify-between px-4 py-3.5 bg-tarjeta border-b-[3px] border-navy">
      <div className="flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-xl border-2 border-navy overflow-hidden flex-none">
          <Image
            src="/logo-peliando.png"
            alt="Peliando"
            width={40}
            height={40}
            className="w-full h-full object-cover"
            priority
          />
        </div>
        <span className="text-xs font-extrabold tracking-[.08em] uppercase">CRM Peliando</span>
      </div>
      <LogoutButton />
    </header>
  );
}
