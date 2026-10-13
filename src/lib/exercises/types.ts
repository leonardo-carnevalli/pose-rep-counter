import type { Joint, Side } from "@/lib/pose/landmarks";

export type ExerciseId = "squat" | "pushup" | "curl" | "jumping-jack";

/** Geometry helpers handed to each feature. They hide the side choice and the 2D or 3D source. */
export interface Body {
  /** Interior angle at `b`, on the measured side unless `side` is given. */
  angle(a: Joint, b: Joint, c: Joint, side?: Side): number;
  /** Angle of the segment `from -> to` away from straight up, on the measured side. */
  lean(from: Joint, to: Joint): number;
  /** Distance between the left and right `joint`, divided by shoulder width. */
  spread(joint: Joint): number;
}

export interface Feature {
  label: string;
  unit: "°" | "×";
  /** Joint where the live value is drawn on the overlay, if any. */
  anchor?: Joint;
  compute(body: Body): number;
}

/**
 * A form cue checked once per completed rep: the rep's min or max of a feature is compared with
 * a threshold. Rules are data, so adding or tuning a cue never touches the engine.
 */
export interface CueRule {
  id: string;
  message: string;
  feature: string;
  aggregate: "min" | "max";
  op: "<" | ">";
  threshold: number;
}

export interface ExerciseConfig {
  id: ExerciseId;
  name: string;
  /** One-line setup hint shown before starting. */
  setup: string;
  /** Camera angle this exercise needs. "any" never blocks. */
  view: "side" | "front" | "any";
  /** "near" measures the limb closest to the camera; "both" requires both sides in frame. */
  sides: "near" | "both";
  requiredJoints: Joint[];
  features: Record<string, Feature>;
  /** Feature that drives the rep state machine. */
  primary: string;
  /**
   * Hysteresis band on the primary feature. A rep starts when the value leaves `rest`, reaches
   * the bottom of the movement when it passes `peak`, and counts when it comes back past `rest`.
   * The gap between the two absorbs jitter, so noise around one threshold cannot double count.
   */
  thresholds: { rest: number; peak: number };
  /** Nominal start and end of a full repetition, used for range of motion %. */
  fullRange: { rest: number; peak: number };
  cues: CueRule[];
}
