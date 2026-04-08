import { Sidebar } from "@/components/shared/sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full bg-black/95 text-zinc-100 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full">
        <div className="mx-auto max-w-6xl p-6 lg:p-10 w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
