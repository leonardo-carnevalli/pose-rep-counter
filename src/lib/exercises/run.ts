import type { PoseFrame } from "@/lib/pose/landmarks";
import { EXERCISES } from "./catalog";
import { createRepEngine, type EngineOptions, type RepRecord } from "./rep-engine";
import type { ExerciseId } from "./types";

/** Runs a whole recorded sequence through a fresh engine and returns the completed reps. */
export function runFrames(exercise: ExerciseId, frames: readonly PoseFrame[], options: EngineOptions): RepRecord[] {
  const engine = createRepEngine(EXERCISES[exercise], options);
  return frames.flatMap((frame) => engine.push(frame).completed ?? []);
}

/** Cue id to number of reps that triggered it. */
export function countCues(reps: readonly RepRecord[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const hit of reps.flatMap((rep) => rep.cues)) counts[hit.id] = (counts[hit.id] ?? 0) + 1;
  return counts;
}
