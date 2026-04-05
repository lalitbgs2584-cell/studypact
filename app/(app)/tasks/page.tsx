import { TodoList } from "@/components/shared/todo-list";
import { CheckCircle2 } from "lucide-react";

export default function TasksPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 h-full max-w-4xl mx-auto flex flex-col min-h-[85vh]">
      <div className="flex items-center gap-4 border-b border-zinc-800/80 pb-6 shrink-0">
        <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
          <CheckCircle2 className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">My Works</h1>
          <p className="text-zinc-400">Manage your outstanding tasks and daily objectives.</p>
        </div>
      </div>

      <div className="flex-1">
        <TodoList />
      </div>
    </div>
  );
}
