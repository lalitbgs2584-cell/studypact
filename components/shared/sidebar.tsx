"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import { LayoutDashboard, Shield, LogOut, ListTodo, Plus, Rss, Trophy, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { StudyPactLogo } from "@/components/shared/studypact-logo";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const user = session?.user as { role?: string | null } | undefined;
  const isAdmin = user?.role === "admin";
  const activeGroupId = pathname.match(/\/group\/([^/]+)/)?.[1] ?? null;

  const routes = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ...(activeGroupId
      ? [{ href: `/group/${activeGroupId}/feed`, label: "Group Feed", icon: Rss }]
      : []),
    { href: "/leaderboards", label: "Leaderboards", icon: Trophy },
    { href: "/uploads", label: "My Uploads", icon: UploadCloud },
    { href: "/groups/create", label: "Create Group", icon: Plus },
    { href: "/tasks", label: "My Tasks", icon: ListTodo },
    ...(isAdmin ? [{ href: "/admin", label: "Admin Dashboard", icon: Shield }] : []),
  ];

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="hidden min-h-screen w-60 flex-col border-r border-border/60 bg-background/60 backdrop-blur-xl md:flex lg:w-64">
      <div className="p-6">
        <Link href="/dashboard" className="group">
          <StudyPactLogo size="sm" labelClassName="text-xl" />
        </Link>
      </div>

      <nav className="mt-4 flex-1 space-y-2 px-4">
        <div className="mb-4 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Menu</div>
        {routes.map((route) => {
          const isActive = pathname.startsWith(route.href);
          const Icon = route.icon;
          const isGroupSection = route.icon === Rss;
          return (
            <div key={route.href}>
              {isGroupSection ? (
                <div className="mt-6 mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                  Groups
                </div>
              ) : null}
              <Link href={route.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "h-11 w-full justify-start gap-3 rounded-xl font-medium text-muted-foreground transition-all duration-300",
                    isActive
                      ? "border border-border bg-secondary text-foreground shadow-inner"
                      : "hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "")} />
                  {route.label}
                </Button>
              </Link>
            </div>
          );
        })}
      </nav>

      <div className="mt-auto p-4">
        <Button
          type="button"
          onClick={handleSignOut}
          variant="ghost"
          className="h-11 w-full justify-start gap-3 rounded-xl border border-border/60 text-muted-foreground transition-colors hover:border-red-500/30 hover:bg-red-500/8 hover:text-red-300"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
