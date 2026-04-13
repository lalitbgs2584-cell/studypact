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
  const [seconds, setSeconds] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSeconds(getSecondsUntilMidnight());
    const interval = setInterval(() => setSeconds(getSecondsUntilMidnight()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (submitted) {
    return (
      <div className="flex items-center gap-2 border border-rule bg-surface/50 px-4 py-2 text-[10px] font-mono tracking-widest text-verified uppercase">
        <span>OBLIGATION MET ✓</span>
      </div>
    );
  }

  const colorStyle =
    seconds === null || seconds >= 14400
      ? "text-parchment"
      : seconds < 3600
        ? "text-wax animate-pulse"
        : "text-parchment-muted";

  return (
    <div className={`flex items-center gap-2 border border-rule px-4 py-2 text-[10px] font-mono tracking-widest uppercase bg-surface/50 ${colorStyle}`}>
      <span>EXECUTION DEADLINE: {seconds === null ? "--:--:--" : formatTime(seconds)}</span>
    </div>
  );
}
