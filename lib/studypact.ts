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
