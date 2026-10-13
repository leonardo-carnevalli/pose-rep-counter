import { detectView, framingGuidance, missingJoints, pickSide, type View } from "@/lib/pose/framing";
import { jointIndex, type PoseFrame, type Side } from "@/lib/pose/landmarks";
import { createOneEuro, DEFAULT_ONE_EURO, type OneEuroOptions } from "@/lib/pose/one-euro";
import { createBody } from "./body";
import { evaluateCues, type CueHit } from "./cues";
import type { ExerciseConfig } from "./types";

/** rest: start position; moving: left it; peak: passed the far end of the movement. */
export type Phase = "rest" | "moving" | "peak";
export type TrackingStatus = "tracking" | "no-pose" | "adjust";

export interface RepRecord {
  index: number;
  /** Seconds from leaving the rest position to returning to it. */
  tempo: number;
  /** Share of the nominal full range reached, 0..100. */
  rom: number;
  cues: CueHit[];
}

export interface FrameLabel {
  landmark: number;
  text: string;
}

export interface FrameResult {
  status: TrackingStatus;
  guidance: string | null;
  phase: Phase;
  reps: number;
  view: View;
  side: Side | null;
  values: Record<string, number>;
  labels: FrameLabel[];
  /** The rep completed on this frame, if any. */
  completed: RepRecord | null;
}

export interface EngineOptions {
  aspect: number;
  /** Measure angles on world landmarks when the frame has them (default) or on image landmarks only. */
  useWorld?: boolean;
  minVisibility?: number;
  smoothing?: OneEuroOptions | null;
}

const VIEW_GUIDANCE = { side: "Turn side-on to the camera", front: "Face the camera" } as const;

/**
 * The rep counter for one exercise. Push frames in time order; it holds no timers or DOM state,
 * so the same code runs on a live camera, a replayed fixture or a unit test.
 */
export function createRepEngine(config: ExerciseConfig, options: EngineOptions) {
  const { aspect, useWorld = true, minVisibility = 0.5, smoothing = DEFAULT_ONE_EURO } = options;
  const filters = new Map<string, (x: number, t: number) => number>();
  const decreasing = config.thresholds.rest > config.thresholds.peak;
  const beyond = (value: number, threshold: number) => (decreasing ? value < threshold : value > threshold);

  let side: Side | null = null;
  let phase: Phase = "rest";
  let reps = 0;
  let repStart = 0;
  let window: Record<string, { min: number; max: number }> = {};

  function smooth(key: string, value: number, t: number): number {
    if (!smoothing) return value;
    let filter = filters.get(key);
    if (!filter) {
      filter = createOneEuro(smoothing);
      filters.set(key, filter);
    }
    return filter(value, t);
  }

  function result(status: TrackingStatus, guidance: string | null, view: View, values: Record<string, number> = {}, completed: RepRecord | null = null): FrameResult {
    const labels = status === "tracking" && side ? buildLabels(config, values, side) : [];
    return { status, guidance, phase, reps, view, side, values, labels, completed };
  }

  function completeRep(t: number): RepRecord {
    reps += 1;
    const extreme = decreasing ? window[config.primary]!.min : window[config.primary]!.max;
    const { rest, peak } = config.fullRange;
    const rom = Math.round(Math.min(1, Math.max(0, (rest - extreme) / (rest - peak))) * 100);
    return { index: reps, tempo: t - repStart, rom, cues: evaluateCues(config.cues, window) };
  }

  function push(frame: PoseFrame): FrameResult {
    const { image } = frame;
    if (!image) return result("no-pose", "Step into view of the camera", "unknown");

    const view = detectView(image, aspect);
    if (config.view !== "any" && view !== "unknown" && view !== config.view) {
      return result("adjust", VIEW_GUIDANCE[config.view], view);
    }

    side = config.sides === "near" ? pickSide(image, config.requiredJoints, side) : (side ?? "left");
    const sides: Side[] = config.sides === "near" ? [side] : ["left", "right"];
    const missing = missingJoints(image, config.requiredJoints, sides, minVisibility);
    if (missing.length > 0) return result("adjust", framingGuidance(missing), view);

    const body = createBody(image, useWorld ? frame.world : null, side, aspect);
    const values: Record<string, number> = {};
    for (const [key, feature] of Object.entries(config.features)) {
      values[key] = smooth(key, feature.compute(body), frame.t);
    }

    const value = values[config.primary]!;
    let completed: RepRecord | null = null;

    if (phase === "rest") {
      if (beyond(value, config.thresholds.rest)) {
        phase = "moving";
        repStart = frame.t;
        window = {};
      }
    } else if (!beyond(value, config.thresholds.rest)) {
      // Back past the rest threshold: a full rep if the peak was reached, otherwise a partial one that does not count.
      if (phase === "peak") completed = completeRep(frame.t);
      phase = "rest";
    } else if (phase === "moving" && beyond(value, config.thresholds.peak)) {
      phase = "peak";
    }

    if (phase !== "rest") {
      for (const [key, v] of Object.entries(values)) {
        const range = window[key];
        window[key] = range ? { min: Math.min(range.min, v), max: Math.max(range.max, v) } : { min: v, max: v };
      }
    }

    return result("tracking", null, view, values, completed);
  }

  return { push, config };
}

export type RepEngine = ReturnType<typeof createRepEngine>;

function buildLabels(config: ExerciseConfig, values: Record<string, number>, side: Side): FrameLabel[] {
  return Object.entries(config.features).flatMap(([key, feature]) =>
    feature.anchor ? [{ landmark: jointIndex(feature.anchor, side), text: `${Math.round(values[key]!)}${feature.unit}` }] : [],
  );
}
