"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { createTaskAction, deleteTaskAction, toggleTaskAction } from "@/lib/actions/studypact";
import {
  CalendarCheck,
  GripVertical,
  Loader2,
  Plus,
  ListTodo,
  Sparkles,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  generateAiTaskSuggestions,
  getTaskCategoryLabel,
} from "@/lib/studypact";

type Task = {
  id: string;
  text: string;
  completed: boolean;
  groupId: string;
  category: string;
  targetMinutes?: number | null;
};

type GroupOption = {
  id: string;
  name: string;
  role?: string | null;
  taskPostingMode?: string | null;
  focusType?: string | null;
};

type TodoListProps = {
  groups: GroupOption[];
  tasks: Task[];
};

const taskCategories = [
  "DSA",
  "DEVELOPMENT",
  "REVISION",
  "INTERVIEW_PREP",
  "READING",
  "CUSTOM",
] as const;

export function TodoList({ groups, tasks: initialTasks }: TodoListProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [newTask, setNewTask] = useState("");
  const [category, setCategory] = useState<(typeof taskCategories)[number]>("CUSTOM");
  const [scope, setScope] = useState<"PERSONAL" | "GROUP">("PERSONAL");
  const [targetMinutes, setTargetMinutes] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId),
    [groups, selectedGroupId],
  );

  const canPostGroupChecklist =
    selectedGroup?.role === "admin" || selectedGroup?.taskPostingMode === "ALL_MEMBERS";

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim() || !selectedGroupId) return;

    startTransition(async () => {
      const createdTask = await createTaskAction({
        groupId: selectedGroupId,
        title: newTask,
        category,
        scope,
        isRecurring,
        targetMinutes: targetMinutes ? Number(targetMinutes) : undefined,
      });

      setTasks((current) => {
        if (!createdTask?.id || current.some((task) => task.id === createdTask.id)) {
          return current;
        }

        return [
          ...current,
          {
            id: createdTask.id,
            text: createdTask.title,
            completed: false,
            groupId: createdTask.groupId,
            category: createdTask.category || category,
            targetMinutes: targetMinutes ? Number(targetMinutes) : null,
          },
        ];
      });

      setNewTask("");
      setTargetMinutes("");
      if (scope === "GROUP") {
        router.refresh();
      }
    });
  };

  const toggleTask = (id: string) => {
    const target = tasks.find((task) => task.id === id);
    if (!target) return;

    const nextCompleted = !target.completed;
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, completed: nextCompleted } : task)),
    );

    startTransition(async () => {
      await toggleTaskAction({ taskId: id, completed: nextCompleted });
    });
  };

  const deleteTask = (id: string) => {
    setTasks((current) => current.filter((task) => task.id !== id));
    startTransition(async () => {
      await deleteTaskAction(id);
    });
  };

  const visibleTasks = useMemo(
    () => tasks.filter((task) => task.groupId === selectedGroupId),
    [selectedGroupId, tasks],
  );

  const completedCount = visibleTasks.filter((task) => task.completed).length;
  const pendingCount = visibleTasks.filter((task) => !task.completed).length;
  const progress = visibleTasks.length === 0 ? 0 : Math.round((completedCount / visibleTasks.length) * 100);
  const aiSuggestions = useMemo(
    () =>
      generateAiTaskSuggestions({
        focusType: selectedGroup?.focusType || "GENERAL",
        completionRate: progress,
        pendingTaskCount: pendingCount,
        streak: 0,
      }),
    [pendingCount, progress, selectedGroup?.focusType],
  );

  return (
    <Card className="bg-black/60 border-zinc-800/80 backdrop-blur-xl relative overflow-hidden shadow-2xl flex flex-col h-full">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-indigo-500 to-primary" />

      <CardHeader className="border-b border-zinc-800/40 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center gap-3 text-white">
              <div className="p-2 rounded-xl bg-primary/20 border border-primary/30 shadow-[0_0_15px_rgba(var(--primary),0.3)]">
                <ListTodo className="w-6 h-6 text-primary" />
              </div>
              Daily Checklist
            </CardTitle>
            <CardDescription className="text-zinc-400 mt-2">
              Create personal tasks or post group checklist items with recurrence.
            </CardDescription>
          </div>

          <div className="hidden sm:flex flex-col items-end">
            <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">
              {progress}%
            </span>
            <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Completion</span>
          </div>
        </div>

        <div className="w-full h-1.5 bg-zinc-900 rounded-full mt-6 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-indigo-500 transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 flex flex-col">
        <div className="px-6 pt-6 bg-zinc-900/20 border-b border-zinc-800/40 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-select" className="text-zinc-300">Active Group</Label>
            <select
              id="group-select"
              value={selectedGroupId}
              onChange={(event) => setSelectedGroupId(event.target.value)}
              className="w-full h-11 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none"
            >
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          {aiSuggestions.length ? (
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-4">
              <div className="flex items-center gap-2 text-sm font-medium text-indigo-200">
                <Sparkles className="w-4 h-4" />
                AI coach preview
              </div>
              <div className="mt-3 space-y-2 text-sm text-zinc-300">
                {aiSuggestions.map((suggestion) => (
                  <p key={suggestion}>{suggestion}</p>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <form onSubmit={addTask} className="p-6 bg-zinc-900/30 border-b border-zinc-800/40 space-y-4 relative z-10">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_140px]">
            <div className="relative">
              <Input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="What needs to be done today?"
                className="pl-4 h-12 bg-zinc-900/80 border-zinc-700/50 text-white placeholder:text-zinc-500 focus-visible:ring-primary/50 text-md rounded-xl"
              />
            </div>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as (typeof taskCategories)[number])}
              className="w-full h-12 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none"
            >
              {taskCategories.map((value) => (
                <option key={value} value={value}>
                  {getTaskCategoryLabel(value)}
                </option>
              ))}
            </select>
            <Input
              value={targetMinutes}
              onChange={(event) => setTargetMinutes(event.target.value)}
              type="number"
              min={15}
              step={15}
              placeholder="Minutes"
              className="h-12 bg-zinc-900/80 border-zinc-700/50 text-white rounded-xl"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={scope}
              onChange={(event) => setScope(event.target.value as "PERSONAL" | "GROUP")}
              disabled={!canPostGroupChecklist}
              className="h-11 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none disabled:opacity-60"
            >
              <option value="PERSONAL">Personal task</option>
              <option value="GROUP">Group checklist item</option>
            </select>

            <label className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(event) => setIsRecurring(event.target.checked)}
                className="accent-primary"
              />
              Recurring task
            </label>

            <Button
              disabled={isPending || !selectedGroupId}
              type="submit"
              className="ml-auto h-12 rounded-xl shadow-[0_0_20px_rgba(var(--primary),0.2)] bg-primary hover:bg-primary/90"
            >
              {isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
              Add Task
            </Button>
          </div>

          {!canPostGroupChecklist ? (
            <p className="text-xs text-zinc-500">
              This group only lets admins publish checklist items for everyone.
            </p>
          ) : null}
        </form>

        <div className="p-6 flex-1 overflow-y-auto">
          {visibleTasks.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-zinc-500 space-y-4">
              <CalendarCheck className="w-12 h-12 opacity-20" />
              <p>No tasks for this group today. Add one above to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {visibleTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className={`group flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${
                      task.completed
                        ? "bg-primary/5 border-primary/20 shadow-[inset_4px_0_0_rgba(var(--primary),0.5)]"
                        : "bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="opacity-0 group-hover:opacity-40 transition-opacity cursor-grab hidden sm:block">
                        <GripVertical className="w-4 h-4 text-zinc-500" />
                      </div>

                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={() => toggleTask(task.id)}
                        className={`w-6 h-6 rounded-md transition-all ${
                          task.completed
                            ? "data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-[0_0_10px_rgba(var(--primary),0.4)]"
                            : "border-zinc-600 hover:border-primary/50"
                        }`}
                      />

                      <div className="flex-1">
                        <span className={`text-base font-medium transition-all duration-300 ${
                          task.completed ? "text-zinc-500 line-through" : "text-zinc-200"
                        }`}>
                          {task.text}
                        </span>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-300">
                            {getTaskCategoryLabel(task.category)}
                          </span>
                          {task.targetMinutes ? (
                            <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-300">
                              {task.targetMinutes} min
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 text-zinc-600 transition-all ml-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
