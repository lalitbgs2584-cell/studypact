"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, ListTodo, Trash2, CalendarCheck, GripVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Task = {
  id: string;
  text: string;
  completed: boolean;
};

export function TodoList() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: "1", text: "Read 10 pages of Atomic Habits", completed: false },
    { id: "2", text: "Complete Next.js Auth module", completed: true },
    { id: "3", text: "Submit check-in to StudyPact CS Group", completed: false },
  ]);
  const [newTask, setNewTask] = useState("");

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    setTasks([...tasks, { id: Date.now().toString(), text: newTask, completed: false }]);
    setNewTask("");
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const progress = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

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
              My Works
            </CardTitle>
            <CardDescription className="text-zinc-400 mt-2">
              Track your daily study goals and tasks.
            </CardDescription>
          </div>
          
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">
              {progress}%
            </span>
            <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Completion</span>
          </div>
        </div>

        {/* Progress Bar Header */}
        <div className="w-full h-1.5 bg-zinc-900 rounded-full mt-6 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-indigo-500 transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 flex flex-col">
        {/* Form area */}
        <form onSubmit={addTask} className="p-6 bg-zinc-900/30 border-b border-zinc-800/40 flex items-center gap-3 relative z-10">
          <div className="relative flex-1">
            <Input 
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="What needs to be done today?" 
              className="pl-4 h-12 bg-zinc-900/80 border-zinc-700/50 text-white placeholder:text-zinc-500 focus-visible:ring-primary/50 text-md rounded-xl"
            />
          </div>
          <Button type="submit" size="icon" className="h-12 w-12 rounded-xl shadow-[0_0_20px_rgba(var(--primary),0.2)] bg-primary hover:bg-primary/90">
            <Plus className="w-5 h-5" />
          </Button>
        </form>

        {/* List area */}
        <div className="p-6 flex-1 overflow-y-auto">
          {tasks.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-zinc-500 space-y-4">
              <CalendarCheck className="w-12 h-12 opacity-20" />
              <p>No tasks yet. Add one above to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {tasks.map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className={`group flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${
                      task.completed 
                        ? 'bg-primary/5 border-primary/20 shadow-[inset_4px_0_0_rgba(var(--primary),0.5)]' 
                        : 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700'
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
                            ? 'data-[state=checked]:bg-primary data-[state=checked]:border-primary shadow-[0_0_10px_rgba(var(--primary),0.4)]' 
                            : 'border-zinc-600 hover:border-primary/50'
                        }`}
                      />
                      
                      <span className={`text-base font-medium transition-all duration-300 ${
                        task.completed ? 'text-zinc-500 line-through' : 'text-zinc-200'
                      }`}>
                        {task.text}
                      </span>
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
