"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

function getSecondsUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function MidnightCountdown({ submitted }: { submitted?: boolean }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    setSeconds(getSecondsUntilMidnight());
    const interval = setInterval(() => setSeconds(getSecondsUntilMidnight()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (submitted) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-300">
        <Clock className="w-4 h-4" />
        <span className="font-medium">Submitted ✓</span>
      </div>
    );
  }

  const color =
    seconds < 3600
      ? "border-red-500/30 bg-red-500/10 text-red-300"
      : seconds < 14400
        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";

  return (
    <div className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-mono font-medium ${color}`}>
      <Clock className="w-4 h-4" />
      <span>{formatTime(seconds)} until midnight</span>
    </div>
  );
}
