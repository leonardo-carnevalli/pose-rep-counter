import { useCallback, useSyncExternalStore } from "react";
import type { SessionSummary } from "@/lib/exercises/summary";
import { clearHistory, readHistory, saveSession } from "@/lib/history";

const EMPTY: SessionSummary[] = [];
const listeners = new Set<() => void>();
let cache: SessionSummary[] | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function update(next: SessionSummary[]) {
  cache = next;
  listeners.forEach((listener) => listener());
}

/** Saved sessions from localStorage. The server render and first paint see an empty list, so hydration matches. */
export function useHistory() {
  const history = useSyncExternalStore(
    subscribe,
    () => (cache ??= readHistory()),
    () => EMPTY,
  );
  const save = useCallback((summary: SessionSummary) => update(saveSession(summary)), []);
  const clear = useCallback(() => {
    clearHistory();
    update([]);
  }, []);
  return { history, save, clear };
}
