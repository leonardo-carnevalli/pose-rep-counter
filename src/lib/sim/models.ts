import type { LM } from "@/lib/pose/landmarks";
import type { ExerciseId } from "@/lib/exercises/types";

/**
 * Kinematic stick figures for synthetic fixtures. Metres, y pointing down (like MediaPipe),
 * x forward for side views and to the person's left for front views.
 */
export type V3 = { x: number; y: number; z: number };
export type Skeleton = Record<keyof typeof LM, V3>;
type Planar = Record<"nose" | "shoulder" | "elbow" | "wrist" | "hip" | "knee" | "ankle", [number, number]>;

/** How one rep is performed. Each model reads the keys it knows and ignores the rest. */
export type RepShape = Record<string, number>;

const SEG = { shin: 0.43, thigh: 0.45, torso: 0.52, upperArm: 0.3, forearm: 0.27, neck: 0.24 };
const HALF_WIDTH = { nose: 0, shoulder: 0.19, elbow: 0.2, wrist: 0.2, hip: 0.14, knee: 0.12, ankle: 0.12 };
const RAD = Math.PI / 180;

const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const step = (from: [number, number], length: number, angleFromDown: number): [number, number] => [
  from[0] + length * Math.sin(angleFromDown * RAD),
  from[1] + length * Math.cos(angleFromDown * RAD),
];

/** Mirrors a side-view stick figure into both body sides, the left side nearest the camera. */
function fromSagittal(p: Planar): Skeleton {
  const at = (joint: keyof Planar, sign: number): V3 => ({ x: p[joint][0], y: p[joint][1], z: sign * HALF_WIDTH[joint] });
  return {
    nose: at("nose", 0),
    leftShoulder: at("shoulder", -1),
    rightShoulder: at("shoulder", 1),
    leftElbow: at("elbow", -1),
    rightElbow: at("elbow", 1),
    leftWrist: at("wrist", -1),
    rightWrist: at("wrist", 1),
    leftHip: at("hip", -1),
    rightHip: at("hip", 1),
    leftKnee: at("knee", -1),
    rightKnee: at("knee", 1),
    leftAnkle: at("ankle", -1),
    rightAnkle: at("ankle", 1),
  };
}

/** p = 0 standing tall, 1 at the bottom. `depth` is the knee angle at the bottom, `lean` extra torso lean. */
function squat(p: number, s: RepShape): Skeleton {
  const knee = lerp(175, s.depth ?? 75, p);
  const shin = 35 * p;
  const thigh = 180 - knee - shin;
  const torso = 8 + p * (30 + (s.lean ?? 0));
  const ankle: [number, number] = [0, 0];
  const kneeAt = step(ankle, SEG.shin, 180 - shin);
  const hip = step(kneeAt, SEG.thigh, 180 + thigh);
  const shoulder = step(hip, SEG.torso, 180 - torso);
  const arm = 15 + 70 * p;
  const elbow = step(shoulder, SEG.upperArm, arm);
  return fromSagittal({
    nose: step(shoulder, SEG.neck, 180 - torso - 15),
    shoulder,
    elbow,
    wrist: step(elbow, SEG.forearm, arm),
    hip,
    knee: kneeAt,
    ankle,
  });
}

/** Law of cosines: distance between the ends of a two-link limb bent at `angle`. */
const limbReach = (a: number, b: number, angle: number) => Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(angle * RAD));

/** p = 0 arms extended, 1 at the bottom. `depth` is the elbow angle at the bottom, `sag` how far the hips drop (m). */
function pushup(p: number, s: RepShape): Skeleton {
  const elbowAngle = lerp(165, s.depth ?? 80, p);
  const handOffset = 0.05;
  const reach = limbReach(SEG.upperArm, SEG.forearm, elbowAngle);
  const shoulderHeight = Math.sqrt(reach * reach - handOffset * handOffset);
  const ankle: [number, number] = [0, -0.08];
  const bodyLength = SEG.shin + SEG.thigh + SEG.torso;
  const incline = Math.asin((shoulderHeight + ankle[1]) / bodyLength);
  const shoulder: [number, number] = [ankle[0] + bodyLength * Math.cos(incline), -shoulderHeight];
  const wrist: [number, number] = [shoulder[0] + handOffset, 0];
  // Elbow: bend the arm backwards (towards the feet) from the shoulder-to-hand line.
  const toHand = Math.atan2(wrist[0] - shoulder[0], wrist[1] - shoulder[1]) / RAD;
  const bend = Math.acos((SEG.upperArm ** 2 + reach ** 2 - SEG.forearm ** 2) / (2 * SEG.upperArm * reach)) / RAD;
  const elbow = step(shoulder, SEG.upperArm, toHand - bend);
  // Hip and knee sit on the ankle-to-shoulder line, the hip pushed down by `sag`.
  const along = (f: number): [number, number] => [lerp(ankle[0], shoulder[0], f), lerp(ankle[1], shoulder[1], f)];
  const sag = (s.sag ?? 0) * p;
  const hipLine = along((SEG.shin + SEG.thigh) / bodyLength);
  const hip: [number, number] = [hipLine[0], hipLine[1] + sag];
  const kneeLine = along(SEG.shin / bodyLength);
  return fromSagittal({
    nose: [shoulder[0] + 0.24, shoulder[1] + 0.02],
    shoulder,
    elbow,
    wrist,
    hip,
    knee: [kneeLine[0], kneeLine[1] + sag * (SEG.shin / (SEG.shin + SEG.thigh))],
    ankle,
  });
}

/** p = 0 arm hanging, 1 fully curled. `top` is the elbow angle at the top, `drift` and `swing` are faults in degrees. */
function curl(p: number, s: RepShape): Skeleton {
  const ankle: [number, number] = [0, 0];
  const knee = step(ankle, SEG.shin, 180);
  const hip = step(knee, SEG.thigh, 180);
  const lean = (s.swing ?? 2) * p;
  const shoulder = step(hip, SEG.torso, 180 + lean);
  const upperArm = 5 + (s.drift ?? 8) * p;
  const elbow = step(shoulder, SEG.upperArm, upperArm);
  const elbowAngle = lerp(165, s.top ?? 40, p);
  return fromSagittal({
    nose: step(shoulder, SEG.neck, 180 + lean - 15),
    shoulder,
    elbow,
    wrist: step(elbow, SEG.forearm, upperArm + (180 - elbowAngle)),
    hip,
    knee,
    ankle,
  });
}

/** Front view. p = 0 arms down and feet together, 1 hands overhead and feet apart. */
function jumpingJack(p: number, s: RepShape): Skeleton {
  const arm = lerp(15, s.arms ?? 170, p);
  const feet = lerp(0.12, s.feet ?? 0.45, p);
  const hop = -0.06 * Math.sin(Math.PI * p);
  const side = (sign: 1 | -1) => {
    const shoulder: [number, number] = [sign * HALF_WIDTH.shoulder, -1.42 + hop];
    const hip: [number, number] = [sign * HALF_WIDTH.hip, -0.9 + hop];
    const ankle: [number, number] = [sign * feet, hop];
    const elbow = step(shoulder, SEG.upperArm, sign * arm);
    return {
      shoulder,
      elbow,
      wrist: step(elbow, SEG.forearm, sign * arm),
      hip,
      knee: [(hip[0] + ankle[0]) / 2, (hip[1] + ankle[1]) / 2] as [number, number],
      ankle,
    };
  };
  const left = side(1);
  const right = side(-1);
  const v = ([x, y]: [number, number]): V3 => ({ x, y, z: 0 });
  return {
    nose: v([0, -1.62 + hop]),
    leftShoulder: v(left.shoulder),
    rightShoulder: v(right.shoulder),
    leftElbow: v(left.elbow),
    rightElbow: v(right.elbow),
    leftWrist: v(left.wrist),
    rightWrist: v(right.wrist),
    leftHip: v(left.hip),
    rightHip: v(right.hip),
    leftKnee: v(left.knee),
    rightKnee: v(right.knee),
    leftAnkle: v(left.ankle),
    rightAnkle: v(right.ankle),
  };
}

export const MODELS: Record<ExerciseId, { model: (p: number, shape: RepShape) => Skeleton; view: "side" | "front" }> = {
  squat: { model: squat, view: "side" },
  pushup: { model: pushup, view: "side" },
  curl: { model: curl, view: "side" },
  "jumping-jack": { model: jumpingJack, view: "front" },
};
