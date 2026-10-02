import { CLASS_COOLDOWN_MS, MAX_DAILY_CLASS_SESSIONS } from "../config/educationRules";
import type { EducationProgress } from "../types/game";

export function getCurrentRealTime(): Date {
  return new Date();
}

export function toStoredTimestamp(date: Date): string {
  return date.toISOString();
}

export function getRealDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getRealWeekKey(date: Date): string {
  const weekStart = getWeekStart(date);
  return getRealDateKey(weekStart);
}

export function getClassesCompletedToday(progress: EducationProgress, now = getCurrentRealTime()): number {
  const todayKey = getRealDateKey(now);
  return progress.decisions.filter((decision) => decision.realDateKey === todayKey).length;
}

export function canTakeClassToday(progress: EducationProgress, now = getCurrentRealTime()): boolean {
  return getClassesCompletedToday(progress, now) < MAX_DAILY_CLASS_SESSIONS;
}

export function getNextClassAvailableAt(progress: EducationProgress): Date | null {
  if (!progress.lastClassDecisionAt) {
    return null;
  }

  return new Date(new Date(progress.lastClassDecisionAt).getTime() + CLASS_COOLDOWN_MS);
}

export function getRemainingClassCooldown(progress: EducationProgress, now = getCurrentRealTime()): number {
  const nextAvailableAt = getNextClassAvailableAt(progress);

  if (!nextAvailableAt) {
    return 0;
  }

  return Math.max(0, nextAvailableAt.getTime() - now.getTime());
}

export function canTakeNextClass(progress: EducationProgress, now = getCurrentRealTime()): boolean {
  return canTakeClassToday(progress, now) && getRemainingClassCooldown(progress, now) === 0;
}

export function formatCooldown(ms: number): string {
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

export function formatRealTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatStoredDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString();
}

export function formatStoredTime(timestamp: string): string {
  return formatRealTime(new Date(timestamp));
}

function getWeekStart(date: Date): Date {
  const weekStart = new Date(date);
  const day = weekStart.getDay();
  const distanceFromMonday = day === 0 ? 6 : day - 1;
  weekStart.setDate(weekStart.getDate() - distanceFromMonday);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}
