"use client";

import Link from "next/link";
import { Home, CheckSquare, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

type MobileGroupNavProps = {
  groupId: string;
  active: string;
};

const items = [
  { id: "feed", label: "Feed", icon: Home, href: (id: string) => `/group/${id}/feed` },
  { id: "tasks", label: "Tasks", icon: CheckSquare, href: () => `/tasks` },
  { id: "checkin", label: "Check-in", icon: Camera, href: (id: string) => `/group/${id}/checkin` },
] as const;

export function MobileGroupNav({ groupId, active }: MobileGroupNavProps) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-black/90 backdrop-blur-xl border-t border-zinc-800/70 flex items-center justify-around px-2">
      {items.map((item) => {
        const isActive = item.id === active;
        const Icon = item.icon;
        return (
          <Link
            key={item.id}
            href={item.href(groupId)}
            aria-label={item.label}
            className={cn(
              "flex flex-col items-center gap-1 flex-1 py-2 text-xs font-medium transition-colors",
              isActive ? "text-primary" : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            <Icon className="w-5 h-5" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
