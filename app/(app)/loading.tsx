export default function AppLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-64 rounded-xl bg-zinc-800/70" />
      <div className="h-5 w-96 max-w-full rounded-lg bg-zinc-900/80" />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="h-64 rounded-2xl bg-zinc-900/60 border border-zinc-800/60" />
        <div className="h-64 rounded-2xl bg-zinc-900/60 border border-zinc-800/60" />
      </div>
    </div>
  );
}
