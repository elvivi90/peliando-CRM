import Link from "next/link";

export function FabNuevaVenta() {
  return (
    <Link
      href="/ventas/nueva"
      aria-label="Nueva venta"
      className="lg:hidden fixed right-4 z-40 w-14 h-14 rounded-2xl bg-amarillo border-[3px] border-navy flex items-center justify-center"
      style={{
        bottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))",
        boxShadow: "4px 4px 0 rgba(20,38,83,.18)",
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#142653" strokeWidth="3" strokeLinecap="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </Link>
  );
}
