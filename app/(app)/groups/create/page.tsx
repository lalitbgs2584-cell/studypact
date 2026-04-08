import { CreateGroupForm } from "@/components/shared/create-group-form";

export default function CreateGroupPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Create a Group</h1>
        <p className="text-zinc-400">Start a private invite-only pact or publish a searchable public group for wider discovery.</p>
      </div>
      <CreateGroupForm />
    </div>
  );
}
