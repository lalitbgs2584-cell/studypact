export function startOfDay(date = new Date()) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

export function formatDayKey(date: Date) {
  return startOfDay(date).toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfYesterday() {
  const yesterday = startOfDay(new Date());
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday;
}

export function getInviteExpiryDate(days = 7) {
  return addDays(new Date(), Math.max(1, Math.floor(days)));
}

export function randomInviteCode() {
  return crypto.randomUUID().slice(0, 8).toUpperCase();
}

export function calculateCompletionRate(completions: number, misses: number) {
  const total = completions + misses;
  if (!total) return 0;
  return Math.round((completions / total) * 100);
}

export function getGroupFocusLabel(value: string) {
  switch (value) {
    case "DSA":
      return "DSA";
    case "DEVELOPMENT":
      return "Development";
    case "EXAM_PREP":
      return "Exam Prep";
    case "MACHINE_LEARNING":
      return "Machine Learning";
    case "CUSTOM":
      return "Custom";
    default:
      return "General";
  }
}

export function getPenaltyModeLabel(value: string) {
  return value === "POOL" ? "Pool" : "Burn";
}

export function getTaskPostingModeLabel(value: string) {
  return value === "ADMINS_ONLY" ? "Admin checklist" : "Shared posting";
}

export function getTaskCategoryLabel(value: string) {
  switch (value) {
    case "DSA":
      return "DSA";
    case "DEVELOPMENT":
      return "Development";
    case "REVISION":
      return "Revision";
    case "INTERVIEW_PREP":
      return "Interview Prep";
    case "READING":
      return "Reading";
    default:
      return "Custom";
  }
}

export function calculateRequiredReviewVotes(memberCount: number) {
  const eligibleReviewers = Math.max(memberCount - 1, 1);
  return Math.floor(eligibleReviewers / 2) + 1;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function calculateReputationScore(input: {
  points: number;
  streak: number;
  completions: number;
  misses: number;
  inactivityStrikes?: number;
}) {
  const base = 60;
  const pointsSignal = Math.round(input.points / 5);
  const streakBonus = Math.min(input.streak * 4, 20);
  const completionBonus = Math.min(input.completions * 3, 24);
  const missPenalty = Math.min(input.misses * 9, 60);
  const inactivityPenalty = Math.min((input.inactivityStrikes ?? 0) * 4, 20);

  return clamp(base + pointsSignal + streakBonus + completionBonus - missPenalty - inactivityPenalty, 0, 100);
}

export function calculateLevel(points: number, completions: number) {
  const xp = Math.max(points, 0) + completions * 12;
  const level = Math.max(1, Math.floor(xp / 120) + 1);
  const currentLevelFloor = (level - 1) * 120;
  const nextLevelCeiling = level * 120;

  return {
    xp,
    level,
    progress: Math.min(
      100,
      Math.round(((xp - currentLevelFloor) / Math.max(nextLevelCeiling - currentLevelFloor, 1)) * 100),
    ),
  };
}

export function getAchievementBadges(input: {
  streak: number;
  completions: number;
  points: number;
  misses: number;
  role?: string | null;
}) {
  const badges: string[] = [];

  if (input.role === "admin") badges.push("Group Captain");
  if (input.streak >= 3) badges.push("Consistency Starter");
  if (input.streak >= 7) badges.push("7 Day Streak");
  if (input.completions >= 10) badges.push("Proof Machine");
  if (input.points >= 100) badges.push("Point Builder");
  if (input.misses === 0 && input.completions >= 5) badges.push("Clean Slate");

  return badges.slice(0, 4);
}

export function generateAiTaskSuggestions(input: {
  focusType?: string | null;
  completionRate: number;
  pendingTaskCount: number;
  streak: number;
}) {
  const suggestions: string[] = [];

  switch (input.focusType) {
    case "DSA":
      suggestions.push("Try one medium problem before starting your easier warm-up set.");
      break;
    case "DEVELOPMENT":
      suggestions.push("Split your dev work into one ship task and one cleanup task for better momentum.");
      break;
    case "EXAM_PREP":
      suggestions.push("Pair one revision block with a timed recall session to improve retention.");
      break;
    case "MACHINE_LEARNING":
      suggestions.push("Balance theory with one small experiment so the day ends with tangible output.");
      break;
    default:
      suggestions.push("Keep the checklist short enough to finish before the daily proof window closes.");
      break;
  }

  if (input.pendingTaskCount >= 4) {
    suggestions.push("You have a heavy load today. Trim one low-value task or turn it into tomorrow's recurring item.");
  }

  if (input.completionRate < 60) {
    suggestions.push("Completion has dipped recently. Pick one must-win task and finish it early to rebuild momentum.");
  }

  if (input.streak >= 5) {
    suggestions.push("Your streak is strong. Add one stretch goal only after you finish the baseline checklist.");
  }

  return suggestions.slice(0, 3);
}

export function generateAiProgressFeedback(input: {
  completionRate: number;
  streak: number;
  misses: number;
  points: number;
}) {
  if (input.completionRate >= 85 && input.streak >= 5) {
    return "You are in a strong consistency zone. Protect the streak with smaller, finishable daily checklists.";
  }

  if (input.misses >= 3) {
    return "Consistency is slipping. Lower the daily scope and prioritize proof-friendly tasks for the next few days.";
  }

  if (input.points < 0) {
    return "Penalties are outweighing wins right now. A shorter daily plan will recover faster than a larger ambitious one.";
  }

  return "Momentum is building. Keep the next checklist focused on tasks you can prove clearly by the deadline.";
}

export function evaluateProofSubmission(input: {
  reflection?: string | null;
  proofText?: string | null;
  proofLink?: string | null;
  completedTaskCount: number;
  totalTaskCount: number;
}) {
  let confidence = 35;
  const notes: string[] = [];

  if (input.proofText?.trim()) {
    confidence += 15;
    notes.push("proof note added");
  }

  if (input.proofLink?.trim()) {
    confidence += 20;
    notes.push("external proof link attached");
  }

  if ((input.reflection?.trim().length ?? 0) >= 40) {
    confidence += 10;
    notes.push("detailed reflection provided");
  }

  const completionRatio =
    input.totalTaskCount > 0 ? input.completedTaskCount / input.totalTaskCount : 0;

  if (completionRatio >= 1) {
    confidence += 20;
    notes.push("all planned tasks marked complete");
  } else if (completionRatio >= 0.5) {
    confidence += 10;
    notes.push("majority of tasks marked complete");
  }

  confidence = clamp(confidence, 10, 98);

  return {
    confidence,
    summary:
      notes.length > 0
        ? `AI review preview: ${notes.join(", ")}.`
        : "AI review preview: limited written evidence, rely on peer proof review.",
  };
}

export function extractInviteToken(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    const match = parsed.pathname.match(/\/join\/([^/]+)/i);
    return match?.[1]?.trim().toUpperCase() ?? "";
  } catch {
    return trimmed.replace(/^\/+|\/+$/g, "").split("/").pop()?.trim().toUpperCase() ?? "";
  }
}
