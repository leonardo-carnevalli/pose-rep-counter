import { EXERCISE_IDS, EXERCISES } from "@/lib/exercises/catalog";
import type { ExerciseId } from "@/lib/exercises/types";
import type { RunState } from "./Stage";

export type SourceKind = "replay" | "camera";

interface ControlsProps {
  exercise: ExerciseId;
  sourceKind: SourceKind;
  voice: boolean;
  run: RunState;
  error: string | null;
  values: Record<string, number>;
  onExercise(id: ExerciseId): void;
  onSource(kind: SourceKind): void;
  onVoice(on: boolean): void;
  onStart(): void;
  onFinish(): void;
}

const SOURCES: { kind: SourceKind; label: string; hint: string }[] = [
  { kind: "replay", label: "Replay demo", hint: "Recorded landmarks, no camera" },
  { kind: "camera", label: "Camera", hint: "Live, processed on this device" },
];

const option =
  "flex cursor-pointer flex-col rounded-xl border border-line bg-surface px-3 py-2 transition-colors hover:border-muted has-checked:border-accent has-checked:bg-raised has-focus-visible:outline-2 has-focus-visible:outline-accent has-disabled:cursor-not-allowed has-disabled:opacity-60";

export function Controls(props: ControlsProps) {
  const { exercise, sourceKind, voice, run, error, values } = props;
  const busy = run !== "idle";
  const features = EXERCISES[exercise].features;

  return (
    <div className="flex flex-col gap-5">
      <fieldset disabled={busy} className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">Exercise</legend>
        <div className="grid grid-cols-2 gap-2">
          {EXERCISE_IDS.map((id) => (
            <label key={id} className={option}>
              <input type="radio" name="exercise" value={id} checked={exercise === id} onChange={() => props.onExercise(id)} className="sr-only" />
              <span className="font-display font-semibold">{EXERCISES[id].name}</span>
              <span className="text-xs text-muted">{EXERCISES[id].view === "front" ? "Face camera" : EXERCISES[id].view === "side" ? "Side-on" : "Any angle"}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset disabled={busy} className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">Source</legend>
        {SOURCES.map((s) => (
          <label key={s.kind} className={option}>
            <input type="radio" name="source" value={s.kind} checked={sourceKind === s.kind} onChange={() => props.onSource(s.kind)} className="sr-only" />
            <span className="font-semibold">{s.label}</span>
            <span className="text-xs text-muted">{s.hint}</span>
          </label>
        ))}
      </fieldset>

      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3 has-focus-visible:outline-2 has-focus-visible:outline-accent">
        <span>Count reps out loud</span>
        <input type="checkbox" role="switch" checked={voice} onChange={(e) => props.onVoice(e.target.checked)} className="size-5 accent-accent" />
      </label>

      {busy ? (
        <button
          type="button"
          onClick={props.onFinish}
          disabled={run === "loading"}
          className="min-h-12 rounded-xl border border-accent px-4 font-display text-lg font-semibold text-accent transition-colors hover:bg-accent hover:text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
        >
          {run === "loading" ? "Starting..." : "Finish set"}
        </button>
      ) : (
        <button
          type="button"
          onClick={props.onStart}
          className="min-h-12 rounded-xl bg-accent px-4 font-display text-lg font-semibold text-accent-ink transition-transform hover:scale-[1.01] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.99]"
        >
          Start {sourceKind === "replay" ? "replay" : "set"}
        </button>
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-warn/50 bg-warn/10 px-3 py-2 text-sm text-warn">
          {error}
        </p>
      )}

      <section aria-label="Live angles" className="rounded-xl border border-line bg-surface p-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Live</h2>
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
          {Object.entries(features).map(([key, feature]) => (
            <div key={key} className="contents">
              <dt className="text-muted">{feature.label}</dt>
              <dd className="text-right font-display tabular-nums">
                {values[key] === undefined ? "-" : `${feature.unit === "×" ? values[key].toFixed(1) : Math.round(values[key])}${feature.unit}`}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
