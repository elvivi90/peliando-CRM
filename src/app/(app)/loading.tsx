export default function Loading() {
  return (
    <div className="flex flex-col gap-5 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-navy/10" />

      <div className="flex flex-wrap gap-4 lg:gap-5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex-1 min-w-[150px] card-chunky overflow-hidden">
            <div className="h-[7px] bg-navy/10" />
            <div className="px-5 py-4 flex flex-col gap-2">
              <div className="h-3 w-20 rounded bg-navy/10" />
              <div className="h-7 w-24 rounded bg-navy/10" />
            </div>
          </div>
        ))}
      </div>

      <div className="card-chunky h-64" />
    </div>
  );
}
