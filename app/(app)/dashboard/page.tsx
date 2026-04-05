import { AdminGroupCard } from "@/components/shared/admin-group-card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">My Study Groups</h1>
          <p className="text-zinc-400">Keep track of your commitments and active pools.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 gap-2 shadow-[0_0_20px_rgba(var(--primary),0.3)]">
          <Plus className="w-4 h-4" /> Create Group
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AdminGroupCard />
        <AdminGroupCard />
      </div>
    </div>
  );
}
