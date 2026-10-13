import { EXERCISES } from "@/lib/exercises/catalog";
import type { SessionSummary } from "@/lib/exercises/summary";
import { RomChart } from "./RomChart";

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-raised px-3 py-2">
      <dt className="text-xs uppercase tracking-wider text-muted">{label}</dt>
      <dd className="font-display text-2xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

export function SummaryCard({ summary }: { summary: SessionSummary }) {
  return (
    <section aria-labelledby="summary-title" className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="summary-title" className="font-display text-xl font-semibold">
          Set summary · {EXERCISES[summary.exercise].name}
        </h2>
        {summary.reps > 0 && <p className="text-xs text-muted">Saved on this device only</p>}
      </div>

      <dl className="grid grid-cols-3 gap-2">
        <Tile label="Reps" value={String(summary.reps)} />
        <Tile label="Avg tempo" value={summary.avgTempo === null ? "-" : `${summary.avgTempo.toFixed(1)} s`} />
        <Tile label="Avg range" value={summary.avgRom === null ? "-" : `${summary.avgRom}%`} />
      </dl>

      <RomChart reps={summary.perRep} />

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Form cues</h3>
        {summary.cues.length === 0 ? (
          <p className="mt-1 text-sm">{summary.reps > 0 ? "No cues this set. Clean work." : "No reps recorded."}</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {summary.cues.map((cue) => (
              <li key={cue.id} className="flex justify-between gap-3">
                <span>{cue.message}</span>
                <span className="tabular-nums text-muted">
                  {cue.count} of {summary.reps} reps
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
