import Link from "next/link";
import { MAS_NAV } from "@/components/layout/nav-items";
import { NavIcon } from "@/components/layout/nav-icon";
import { PageHeader } from "@/components/ui/page-header";

export default function MasPage() {
  return (
    <div>
      <PageHeader title="Más" />
      <div className="flex flex-col gap-3">
        {MAS_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="card-chunky flex items-center gap-3.5 px-5 py-4 font-extrabold"
          >
            <span className="w-9 h-9 rounded-lg bg-amarillo/30 border-2 border-navy flex items-center justify-center flex-none">
              <NavIcon icon={item.icon} />
            </span>
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
