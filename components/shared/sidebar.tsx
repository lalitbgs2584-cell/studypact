"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import { LayoutDashboard, Shield, Goal, User, LogOut, ListTodo, Plus, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const user = session?.user as
    | { name?: string | null; email?: string | null; role?: string | null }
    | undefined;
  const isAdmin = user?.role === "admin";
  const routes = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/groups/create", label: "Create Group", icon: Plus },
    { href: "/groups/discover", label: "Discover Groups", icon: Compass },
    { href: "/tasks", label: "My Tasks", icon: ListTodo },
    ...(isAdmin ? [{ href: "/admin", label: "Admin Dashboard", icon: Shield }] : []),
  ];

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="w-64 lg:w-72 border-r border-zinc-800/50 bg-black/40 backdrop-blur-xl flex flex-col hidden md:flex min-h-screen">
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="bg-primary/20 p-2 rounded-xl border border-primary/30 group-hover:bg-primary/30 transition-all shadow-[0_0_20px_rgba(var(--primary),0.3)]">
            <Goal className="w-6 h-6 text-primary" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">StudyPact</span>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4 px-2">Menu</div>
        {routes.map((route) => {
          const isActive = pathname.startsWith(route.href);
          const Icon = route.icon;
          return (
            <Link key={route.href} href={route.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 rounded-xl h-11 text-zinc-400 font-medium transition-all duration-300",
                  isActive ? "bg-zinc-800/50 text-white shadow-inner border border-zinc-700/50" : "hover:text-white hover:bg-zinc-800/30"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-primary" : "")} />
                {route.label}
              </Button>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto border-t border-zinc-800/50">
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-zinc-800/50 transition-colors cursor-pointer border border-transparent hover:border-zinc-700/50 group text-left"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-900 border border-zinc-600 flex items-center justify-center shadow-lg group-hover:border-zinc-500 transition-colors">
            <User className="w-5 h-5 text-zinc-300" />
          </div>
          <div className="flex flex-col flex-1">
            <span className="text-sm font-medium text-white group-hover:text-primary transition-colors">Logout / Switch User</span>
            <span className="text-xs text-zinc-500">{user?.name || user?.email || "student@example.com"}</span>
          </div>
          <LogOut className="w-4 h-4 text-zinc-500 group-hover:text-red-400 transition-colors" />
        </button>
      </div>
    </aside>
  );
}
