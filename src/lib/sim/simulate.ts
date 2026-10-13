import { LANDMARK_COUNT, LM, type Point, type PoseFrame } from "@/lib/pose/landmarks";
import type { ExerciseId } from "@/lib/exercises/types";
import { MODELS, type RepShape, type Skeleton, type V3 } from "./models";
import { createRandom, type Random } from "./random";

export interface RepPlan {
  /** Seconds for the full down-and-up movement. Random in [1.8, 2.6] when omitted. */
  duration?: number;
  shape?: RepShape;
}

/** Gaussian noise sigma: normalised image units and metres. */
export interface Noise {
  image: number;
  world: number;
}

export interface Dropout {
  /** The gap happens during the pause after this rep (1-based). */
  afterRep: number;
  seconds: number;
  kind: "no-pose" | "legs-hidden";
}

export interface SetPlan {
  exercise: ExerciseId;
  seed: number;
  reps: RepPlan[];
  fps?: number;
  aspect?: number;
  noise?: Noise;
  dropouts?: Dropout[];
}

export const DEFAULT_NOISE: Noise = { image: 0.003, world: 0.008 };

const KEYS = Object.keys(LM) as (keyof typeof LM)[];
const ease = (x: number) => (1 - Math.cos(Math.PI * x)) / 2;

/** Rep progress over normalised time: 45% down, 10% hold at the bottom, 45% up. */
export function repProgress(tau: number): number {
  if (tau < 0.45) return ease(tau / 0.45);
  if (tau < 0.55) return 1;
  return ease(1 - (tau - 0.55) / 0.45);
}

interface Framing {
  scale: number;
  cx: number;
  cy: number;
}

/** Fits the movement's bounding box into 80% of the frame, the way a user would stand. */
function frameFor(exercise: ExerciseId, aspect: number): Framing {
  const { model } = MODELS[exercise];
  const points = [0, 1].flatMap((p) => Object.values(model(p, {})));
  const xs = points.map((v) => v.x);
  const ys = points.map((v) => v.y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const scale = Math.min(0.8 / (maxY - minY), (0.8 * aspect) / (maxX - minX));
  return { scale, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

function visibilityFor(key: keyof typeof LM, sideView: boolean, rng: Random): number {
  const far = sideView && key.startsWith("right");
  return far ? rng.range(0.3, 0.6) : rng.range(0.9, 0.99);
}

function render(skeleton: Skeleton, sideView: boolean, f: Framing, aspect: number, noise: Noise, rng: Random, legsHidden: boolean) {
  const hip: V3 = {
    x: (skeleton.leftHip.x + skeleton.rightHip.x) / 2,
    y: (skeleton.leftHip.y + skeleton.rightHip.y) / 2,
    z: (skeleton.leftHip.z + skeleton.rightHip.z) / 2,
  };
  const image: Point[] = Array.from({ length: LANDMARK_COUNT }, () => ({ x: 0, y: 0, z: 0, visibility: 0 }));
  const world: Point[] = Array.from({ length: LANDMARK_COUNT }, () => ({ x: 0, y: 0, z: 0, visibility: 0 }));
  for (const key of KEYS) {
    const v = skeleton[key];
    const hidden = legsHidden && /Knee|Ankle/.test(key);
    const visibility = hidden ? rng.range(0.05, 0.2) : visibilityFor(key, sideView, rng);
    image[LM[key]] = {
      x: 0.5 + ((v.x - f.cx) * f.scale) / aspect + rng.gaussian(noise.image),
      y: 0.5 + (v.y - f.cy) * f.scale + rng.gaussian(noise.image),
      z: ((v.z - hip.z) * f.scale) / aspect,
      visibility,
    };
    world[LM[key]] = {
      x: v.x - hip.x + rng.gaussian(noise.world),
      y: v.y - hip.y + rng.gaussian(noise.world),
      z: v.z - hip.z + rng.gaussian(noise.world),
      visibility,
    };
  }
  return { image, world };
}

/** Simulates a whole set as a pose sequence, the way the camera loop would produce it. */
export function simulateSet(plan: SetPlan): PoseFrame[] {
  const fps = plan.fps ?? 30;
  const aspect = plan.aspect ?? 16 / 9;
  const noise = plan.noise ?? DEFAULT_NOISE;
  const rng = createRandom(plan.seed);
  const { model, view } = MODELS[plan.exercise];
  const framing = frameFor(plan.exercise, aspect);
  const sideView = view === "side";

  type Segment = { seconds: number; shape: RepShape; moving: boolean; gap?: Dropout["kind"] };
  const segments: Segment[] = [{ seconds: 1, shape: {}, moving: false }];
  plan.reps.forEach((rep, i) => {
    segments.push({ seconds: rep.duration ?? rng.range(1.8, 2.6), shape: rep.shape ?? {}, moving: true });
    const dropout = plan.dropouts?.find((d) => d.afterRep === i + 1);
    if (dropout) segments.push({ seconds: dropout.seconds, shape: {}, moving: false, gap: dropout.kind });
    segments.push({ seconds: rng.range(0.4, 0.9), shape: {}, moving: false });
  });

  const frames: PoseFrame[] = [];
  let t = 0;
  for (const segment of segments) {
    const count = Math.round(segment.seconds * fps);
    for (let i = 0; i < count; i++) {
      const p = segment.moving ? repProgress(i / count) : 0;
      if (segment.gap === "no-pose") {
        frames.push({ t, image: null, world: null });
      } else {
        frames.push({ t, ...render(model(p, segment.shape), sideView, framing, aspect, noise, rng, segment.gap === "legs-hidden") });
      }
      t = Math.round((t + 1 / fps) * 1e4) / 1e4;
    }
  }
  return frames;
}
