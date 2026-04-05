import { CreateGroupForm } from "@/components/shared/create-group-form";
import { AdminGroupCard } from "@/components/shared/admin-group-card";

export default function AdminPage() {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Admin Center</h1>
        <p className="text-zinc-400">Manage your groups, resolve disputes, and configure plans.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-semibold text-zinc-100">Groups You Manage</h2>
          <AdminGroupCard />
        </div>
        <div className="lg:col-span-1 border border-zinc-800/60 bg-black/20 rounded-2xl p-6 h-fit backdrop-blur-lg">
          <CreateGroupForm />
        </div>
      </div>
    </div>
  );
}
