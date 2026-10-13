import { EXERCISES } from "@/lib/exercises/catalog";
import type { SessionSummary } from "@/lib/exercises/summary";

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

export function HistoryList({ history, onClear }: { history: SessionSummary[]; onClear(): void }) {
  return (
    <section aria-labelledby="history-title" className="rounded-xl border border-line bg-surface p-3">
      <div className="flex items-center justify-between">
        <h2 id="history-title" className="text-sm font-semibold uppercase tracking-wider text-muted">
          History
        </h2>
        {history.length > 0 && (
          <button type="button" onClick={onClear} className="min-h-8 rounded px-2 text-xs text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-accent">
            Clear
          </button>
        )}
      </div>
      {history.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Finished sets are kept in this browser only.</p>
      ) : (
        <ul className="mt-2 flex flex-col divide-y divide-line text-sm">
          {history.map((s) => (
            <li key={s.id} className="flex items-baseline justify-between gap-2 py-2">
              <span>
                <span className="font-semibold">{EXERCISES[s.exercise].name}</span>
                <span className="block text-xs text-muted">{dateFormat.format(new Date(s.startedAt))}</span>
              </span>
              <span className="text-right tabular-nums">
                {s.reps} reps
                {s.avgRom !== null && <span className="block text-xs text-muted">{s.avgRom}% range</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
