"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { Phase, TrackingStatus } from "@/lib/exercises/rep-engine";
import type { ExerciseConfig } from "@/lib/exercises/types";
import type { View } from "@/lib/pose/framing";

export type RunState = "idle" | "loading" | "running";

export interface LiveState {
  reps: number;
  status: TrackingStatus | null;
  guidance: string | null;
  phase: Phase;
  view: View;
  values: Record<string, number>;
  last: { tempo: number; rom: number } | null;
}

export interface Toast {
  id: number;
  message: string;
}

interface StageProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  aspect: number;
  mirrored: boolean;
  showVideo: boolean;
  run: RunState;
  live: LiveState;
  toasts: Toast[];
  exercise: ExerciseConfig;
}

const PHASE_LABEL: Record<Phase, string> = { rest: "Start position", moving: "Moving", peak: "Range reached" };

function StatusPill({ run, live }: { run: RunState; live: LiveState }) {
  const warn = run === "running" && live.status !== null && live.status !== "tracking";
  const text =
    run === "loading"
      ? "Loading..."
      : run === "idle"
        ? "Ready"
        : warn
          ? (live.guidance ?? "Adjust your position")
          : live.status === "tracking"
            ? `Tracking${live.view === "unknown" ? "" : ` · ${live.view} view`}`
            : "Waiting for the first frame";
  return (
    <p
      role="status"
      className={`rounded-full px-3 py-1 text-sm font-medium backdrop-blur ${warn ? "bg-warn text-warn-ink" : "bg-ink/75 text-text"}`}
    >
      {text}
    </p>
  );
}

export function Stage({ videoRef, canvasRef, aspect, mirrored, showVideo, run, live, toasts, exercise }: StageProps) {
  const boxRef = useRef<HTMLDivElement>(null);

  // Keep the canvas backing store at device resolution so lines and labels stay sharp.
  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (!box || !canvas) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(entry.contentRect.width * dpr);
      canvas.height = Math.round(entry.contentRect.height * dpr);
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, [canvasRef]);

  return (
    <section aria-label="Camera stage" className="relative flex flex-col gap-3">
      <div ref={boxRef} className="stage-grid relative w-full overflow-hidden rounded-2xl border border-line" style={{ aspectRatio: aspect }}>
        <video
          ref={videoRef}
          className={`absolute inset-0 size-full object-cover ${mirrored ? "-scale-x-100" : ""} ${showVideo ? "" : "invisible"}`}
          playsInline
          muted
          aria-hidden
        />
        <canvas ref={canvasRef} className="absolute inset-0 size-full" aria-hidden />

        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <StatusPill run={run} live={live} />
          {run === "running" && (
            <p className="hidden rounded-full bg-ink/75 px-3 py-1 text-sm text-muted backdrop-blur sm:block">{PHASE_LABEL[live.phase]}</p>
          )}
        </div>

        <ul aria-live="polite" className="pointer-events-none absolute inset-x-0 top-14 flex flex-col items-center gap-2 px-3">
          {toasts.map((toast) => (
            <li key={toast.id} className="rounded-xl bg-warn px-4 py-2 text-sm font-semibold text-warn-ink shadow-lg">
              {toast.message}
            </li>
          ))}
        </ul>

        {run === "idle" && live.reps === 0 && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div className="max-w-sm">
              <p className="font-display text-xl font-semibold">{exercise.name}</p>
              <p className="mt-1 text-sm text-muted">{exercise.setup}</p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-line bg-surface px-4 py-2 sm:absolute sm:bottom-3 sm:left-3 sm:border-0 sm:bg-ink/80 sm:backdrop-blur">
        <p aria-live="polite" aria-atomic className="font-display leading-none">
          <span data-testid="rep-count" className="text-5xl font-bold tabular-nums text-accent sm:text-7xl">
            {live.reps}
          </span>
          <span className="ml-2 text-lg text-muted">{live.reps === 1 ? "rep" : "reps"}</span>
        </p>
        {live.last && (
          <p className="mt-1 text-sm tabular-nums text-muted">
            Last: {live.last.tempo.toFixed(1)} s · {live.last.rom}% range
          </p>
        )}
      </div>
    </section>
  );
}
