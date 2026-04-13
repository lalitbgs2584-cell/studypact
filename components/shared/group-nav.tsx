"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type GroupNavProps = {
  groupId: string;
  active: "feed" | "checkin" | "ledger" | "gallery" | "docs" | "confessions" | "redemption" | "tasks";
};

const primaryItems = [
  { id: "feed", label: "Feed" },
  { id: "checkin", label: "Check-in" },
  { id: "tasks", label: "Tasks" },
] as const;

const secondaryItems = [
  { id: "ledger", label: "Ledger" },
  { id: "gallery", label: "Proof Gallery" },
  { id: "docs", label: "Docs" },
  { id: "confessions", label: "Confessions" },
  { id: "redemption", label: "Redemption" },
] as const;

const secondaryIds = secondaryItems.map((i) => i.id) as string[];

export function GroupNav({ groupId, active }: GroupNavProps) {
  const [open, setOpen] = useState(false);
  const activeIsSecondary = secondaryIds.includes(active);

  function href(id: string) {
    if (id === "tasks") return `/tasks`;
    return `/group/${groupId}/${id}`;
  }

  return (
    <div className="relative flex flex-wrap gap-2 rounded-2xl border border-zinc-800/70 bg-zinc-950/40 p-2">
      {primaryItems.map((item) => (
        <Link
          key={item.id}
          href={href(item.id)}
          className={cn(
            "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
            item.id === active
              ? "bg-primary text-primary-foreground"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100",
          )}
        >
          {item.label}
        </Link>
      ))}

      {/* More button */}
      <div className="relative">
        <button
          type="button"
          aria-label={activeIsSecondary ? `More — currently on ${secondaryItems.find((i) => i.id === active)?.label}` : "More options"}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-colors",
            activeIsSecondary
              ? "bg-primary text-primary-foreground"
              : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100",
          )}
        >
          {activeIsSecondary
            ? (secondaryItems.find((i) => i.id === active)?.label ?? "More")
            : "More"}
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")} />
          {activeIsSecondary && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground ml-0.5" />
          )}
        </button>

        {open && (
          <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[160px] rounded-xl border border-zinc-800 bg-zinc-950 shadow-xl overflow-hidden">
            {secondaryItems.map((item) => (
              <Link
                key={item.id}
                href={href(item.id)}
                onClick={() => setOpen(false)}
                className={cn(
                  "block px-4 py-2.5 text-sm font-medium transition-colors",
                  item.id === active
                    ? "bg-primary/10 text-primary"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
