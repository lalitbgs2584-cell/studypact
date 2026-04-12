import Link from "next/link";
import { cn } from "@/lib/utils";

type GroupNavProps = {
  groupId: string;
  active: "feed" | "checkin" | "ledger" | "gallery" | "docs" | "confessions" | "redemption";
};

const items = [
  { id: "feed", label: "Feed" },
  { id: "checkin", label: "Check-in" },
  { id: "ledger", label: "Ledger" },
  { id: "gallery", label: "Proof Gallery" },
  { id: "docs", label: "Docs" },
  { id: "confessions", label: "Confessions" },
  { id: "redemption", label: "Redemption" },
] as const;

export function GroupNav({ groupId, active }: GroupNavProps) {
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-zinc-800/70 bg-zinc-950/40 p-2">
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/group/${groupId}/${item.id}`}
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
    </div>
  );
}
