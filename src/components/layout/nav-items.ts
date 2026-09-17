export type NavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  icon:
    | "grid"
    | "cart"
    | "users"
    | "tag"
    | "calendar"
    | "package"
    | "receipt"
    | "chart"
    | "box"
    | "more";
};

export const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "grid" },
  { href: "/ventas", label: "Ventas", icon: "cart" },
  { href: "/clientes", label: "Clientes", icon: "users" },
  { href: "/precios", label: "Precios", icon: "tag" },
  { href: "/eventos", label: "Eventos", icon: "calendar" },
  { href: "/concesion", label: "Concesión", icon: "package" },
  { href: "/gastos", label: "Gastos", icon: "receipt" },
  { href: "/reportes", label: "Reportes", icon: "chart" },
  { href: "/productos", label: "Productos", icon: "box" },
];

export const MOBILE_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "grid" },
  { href: "/ventas", label: "Ventas", icon: "cart" },
  { href: "/clientes", label: "Clientes", icon: "users" },
  { href: "/mas", label: "Más", icon: "more" },
];

export const MAS_NAV: NavItem[] = [
  { href: "/precios", label: "Lista de precios", icon: "tag" },
  { href: "/eventos", label: "Eventos", icon: "calendar" },
  { href: "/concesion", label: "Concesión", icon: "package" },
  { href: "/gastos", label: "Gastos", icon: "receipt" },
  { href: "/reportes", label: "Reportes", icon: "chart" },
  { href: "/productos", label: "Productos", icon: "box" },
];
