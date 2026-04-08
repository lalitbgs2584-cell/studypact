export default function GroupRouteLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-72 rounded-xl bg-zinc-800/70" />
      <div className="h-4 w-96 max-w-full rounded-lg bg-zinc-900/80" />
      <div className="flex gap-2">
        <div className="h-10 w-24 rounded-xl bg-zinc-900/70" />
        <div className="h-10 w-24 rounded-xl bg-zinc-900/70" />
        <div className="h-10 w-24 rounded-xl bg-zinc-900/70" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 h-72 rounded-2xl border border-zinc-800/60 bg-zinc-900/60" />
        <div className="h-72 rounded-2xl border border-zinc-800/60 bg-zinc-900/60" />
      </div>
    </div>
  );
}
