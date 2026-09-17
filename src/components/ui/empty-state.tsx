export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="card-chunky flex flex-col items-center justify-center text-center gap-1.5 py-14 px-6">
      <p className="font-extrabold text-lg">{title}</p>
      {subtitle && <p className="text-sm text-navy/60 max-w-sm">{subtitle}</p>}
    </div>
  );
}
