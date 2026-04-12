import { Sidebar } from "@/components/shared/sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-background pt-[2px] text-foreground">
      <div className="fixed top-0 left-0 right-0 z-50 h-[2px] bg-gradient-to-r from-primary via-accent to-primary opacity-80" />
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full">
        <div className="mx-auto max-w-6xl p-6 lg:p-10 w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
