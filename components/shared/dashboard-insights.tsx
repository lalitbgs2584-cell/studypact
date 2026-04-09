"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";

type DashboardInsightsProps = {
  trend: Array<{
    day: string;
    completed: number;
    missed: number;
  }>;
  badges: string[];
  aiFeedback: string;
  level: {
    xp: number;
    level: number;
    progress: number;
  };
  alerts: Array<{
    id: string;
    title: string;
    detail: string;
  }>;
};

export function DashboardInsights({
  trend,
  badges,
  aiFeedback,
  level,
  alerts,
}: DashboardInsightsProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
      <div className="rounded-3xl border border-zinc-800/70 bg-black/30 p-5 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl font-semibold text-white">Progress Dashboard</h2>
            <p className="text-sm text-zinc-500">7 day view of completed vs missed check-ins.</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-zinc-500">Level {level.level}</p>
            <p className="text-xs text-zinc-600">{level.xp} XP</p>
          </div>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="completedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="missedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="day" stroke="#71717a" tickLine={false} axisLine={false} />
              <YAxis stroke="#71717a" tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#09090b",
                  borderColor: "#27272a",
                  color: "#fafafa",
                }}
              />
              <Area type="monotone" dataKey="completed" stroke="#34d399" fill="url(#completedFill)" strokeWidth={2} />
              <Area type="monotone" dataKey="missed" stroke="#f97316" fill="url(#missedFill)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-3xl border border-zinc-800/70 bg-black/30 p-5 backdrop-blur-xl">
          <h2 className="text-xl font-semibold text-white">Gamification</h2>
          <div className="mt-4 h-3 rounded-full bg-zinc-900 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400"
              style={{ width: `${level.progress}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-zinc-400">
            {level.progress}% toward level {level.level + 1}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {badges.length ? (
              badges.map((badge) => (
                <Badge key={badge} variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  {badge}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-zinc-500">Badges unlock as your streak and completions grow.</p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-indigo-500/20 bg-indigo-500/10 p-5">
          <h2 className="text-xl font-semibold text-white">AI Progress Feedback</h2>
          <p className="mt-3 text-sm text-indigo-100">{aiFeedback}</p>
        </div>

        <div className="rounded-3xl border border-zinc-800/70 bg-black/30 p-5 backdrop-blur-xl">
          <h2 className="text-xl font-semibold text-white">Notification Center</h2>
          <div className="mt-4 space-y-3">
            {alerts.length ? (
              alerts.map((alert) => (
                <div key={alert.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/50 px-4 py-3">
                  <p className="text-sm font-medium text-white">{alert.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">{alert.detail}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500">No major alerts right now.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
