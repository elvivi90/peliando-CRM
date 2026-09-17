const STRIPE_COLOR = {
  amarillo: "bg-amarillo",
  rosa: "bg-rosa",
  navy: "bg-navy",
  azul: "bg-azul",
} as const;

export function StatCard({
  label,
  value,
  hint,
  stripe,
  hintColor,
}: {
  label: string;
  value: string;
  hint?: string;
  stripe: keyof typeof STRIPE_COLOR;
  hintColor?: "rosa";
}) {
  return (
    <div className="flex-1 min-w-[150px] card-chunky overflow-hidden">
      <div className={`h-[7px] ${STRIPE_COLOR[stripe]}`} />
      <div className="px-5 py-4">
        <div className="text-[11px] font-extrabold tracking-[.06em] uppercase text-navy/60">
          {label}
        </div>
        <div className="text-2xl lg:text-[30px] font-black tracking-tight mt-1.5">{value}</div>
        {hint && (
          <div
            className={`text-[13px] mt-1 ${hintColor === "rosa" ? "text-rosa font-semibold" : "text-navy/60"}`}
          >
            {hint}
          </div>
        )}
      </div>
    </div>
  );
}
