import type { ExerciseId } from "./types";
import type { RepRecord } from "./rep-engine";

export interface SessionSummary {
  id: string;
  exercise: ExerciseId;
  startedAt: string;
  reps: number;
  /** Mean seconds per rep, or null with no reps. */
  avgTempo: number | null;
  /** Mean range of motion %, or null with no reps. */
  avgRom: number | null;
  cues: { id: string; message: string; count: number }[];
  perRep: { index: number; tempo: number; rom: number; cues: string[] }[];
}

const mean = (values: number[]) => (values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length);
const round = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits;

export function summarize(exercise: ExerciseId, startedAt: Date, reps: readonly RepRecord[]): SessionSummary {
  const cues = new Map<string, { id: string; message: string; count: number }>();
  for (const hit of reps.flatMap((rep) => rep.cues)) {
    const entry = cues.get(hit.id) ?? { id: hit.id, message: hit.message, count: 0 };
    entry.count += 1;
    cues.set(hit.id, entry);
  }
  const avgTempo = mean(reps.map((rep) => rep.tempo));
  const avgRom = mean(reps.map((rep) => rep.rom));

  return {
    id: `${exercise}-${startedAt.getTime()}`,
    exercise,
    startedAt: startedAt.toISOString(),
    reps: reps.length,
    avgTempo: avgTempo === null ? null : round(avgTempo, 2),
    avgRom: avgRom === null ? null : Math.round(avgRom),
    cues: [...cues.values()].sort((a, b) => b.count - a.count),
    perRep: reps.map((rep) => ({ index: rep.index, tempo: round(rep.tempo, 2), rom: rep.rom, cues: rep.cues.map((hit) => hit.id) })),
  };
}
