export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <div className="h-10 w-64 rounded-xl bg-zinc-800/70" />
          <div className="h-4 w-80 rounded-lg bg-zinc-900/80" />
        </div>
        <div className="h-11 w-36 rounded-xl bg-zinc-900/70" />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-64 rounded-2xl border border-zinc-800/60 bg-zinc-900/60" />
        <div className="h-64 rounded-2xl border border-zinc-800/60 bg-zinc-900/60" />
      </div>
    </div>
  );
}
