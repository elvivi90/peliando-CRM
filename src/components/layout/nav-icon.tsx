import type { NavItem } from "./nav-items";

const common = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function NavIcon({ icon }: { icon: NavItem["icon"] }) {
  switch (icon) {
    case "grid":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="8" height="8" rx="1.5" />
          <rect x="13" y="3" width="8" height="8" rx="1.5" />
          <rect x="3" y="13" width="8" height="8" rx="1.5" />
          <rect x="13" y="13" width="8" height="8" rx="1.5" />
        </svg>
      );
    case "cart":
      return (
        <svg {...common}>
          <path d="M4 4h16l-1.5 9h-13z" />
          <circle cx="9" cy="19" r="1.4" />
          <circle cx="17" cy="19" r="1.4" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M4.5 20c1.5-4 4.5-6 7.5-6s6 2 7.5 6" />
        </svg>
      );
    case "tag":
      return (
        <svg {...common}>
          <path d="M12 3h6a2 2 0 0 1 2 2v6a2 2 0 0 1-.6 1.4l-8 8a2 2 0 0 1-2.8 0l-6-6a2 2 0 0 1 0-2.8l8-8A2 2 0 0 1 12 3Z" />
          <circle cx="15.5" cy="8.5" r="1.4" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
          <path d="M8 3v4M16 3v4M3.5 10.5h17" />
        </svg>
      );
    case "package":
      return (
        <svg {...common}>
          <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
          <path d="M4 7.5 12 12l8-4.5M12 12v9" />
        </svg>
      );
    case "receipt":
      return (
        <svg {...common}>
          <path d="M6 3h12v18l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-1.5V3Z" />
          <path d="M9 8h6M9 12h6" />
        </svg>
      );
    case "chart":
      return (
        <svg {...common}>
          <path d="M4 20V10M11 20V4M18 20v-7" />
          <path d="M2.5 20h19" />
        </svg>
      );
    case "box":
      return (
        <svg {...common}>
          <rect x="4" y="7" width="16" height="13" rx="1.5" />
          <path d="M4 7l8-4 8 4M9 11v5M15 11v5" />
        </svg>
      );
    case "more":
      return (
        <svg {...common}>
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      );
  }
}
