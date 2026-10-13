import { isExerciseId } from "@/lib/exercises/catalog";
import type { SessionSummary } from "@/lib/exercises/summary";

const KEY = "pose-rep-counter:history:v1";
const LIMIT = 20;

function isSummary(value: unknown): value is SessionSummary {
  const s = value as SessionSummary | null;
  return (
    !!s &&
    typeof s.id === "string" &&
    typeof s.exercise === "string" &&
    isExerciseId(s.exercise) &&
    typeof s.startedAt === "string" &&
    typeof s.reps === "number" &&
    Array.isArray(s.cues) &&
    Array.isArray(s.perRep)
  );
}

/** Saved sessions, newest first. Storage can be blocked or corrupted, so every failure reads as empty. */
export function readHistory(): SessionSummary[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isSummary) : [];
  } catch {
    return [];
  }
}

/** Returns the new list; it is still returned (unsaved) when storage is unavailable. */
export function saveSession(summary: SessionSummary): SessionSummary[] {
  const next = [summary, ...readHistory().filter((s) => s.id !== summary.id)].slice(0, LIMIT);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode or a full quota: keep the session for this page view only.
  }
  return next;
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}
