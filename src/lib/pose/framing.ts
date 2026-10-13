import { distance2d } from "./angles";
import { jointIndex, LM, type Joint, type Point, type Side } from "./landmarks";

export type View = "side" | "front" | "unknown";

/** Shoulder width over torso length: about 0.7 facing the camera, near 0 side-on. */
const SIDE_MAX_RATIO = 0.3;
const FRONT_MIN_RATIO = 0.5;
/** Landmarks may sit a little outside the frame before we call them missing. */
const FRAME_MARGIN = 0.02;

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2, visibility: Math.min(a.visibility, b.visibility) };
}

export function shoulderToTorsoRatio(image: Point[], aspect: number): number {
  const ls = image[LM.leftShoulder]!;
  const rs = image[LM.rightShoulder]!;
  const torso = distance2d(midpoint(ls, rs), midpoint(image[LM.leftHip]!, image[LM.rightHip]!), aspect);
  return torso === 0 ? Number.NaN : distance2d(ls, rs, aspect) / torso;
}

/** Classifies the camera angle from the image landmarks. In-between ratios are "unknown" and never block a set. */
export function detectView(image: Point[], aspect: number): View {
  const ratio = shoulderToTorsoRatio(image, aspect);
  if (ratio < SIDE_MAX_RATIO) return "side";
  if (ratio > FRONT_MIN_RATIO) return "front";
  return "unknown";
}

/** Summed visibility the far side must beat the current side by before we switch, so the measured limb does not flicker. */
const SIDE_SWITCH_MARGIN = 0.6;

/** Picks the body side the camera sees best, so a side-on user is measured on the near limbs. */
export function pickSide(image: Point[], joints: readonly Joint[], current: Side | null = null): Side {
  const score = (side: Side) => joints.reduce((sum, joint) => sum + image[jointIndex(joint, side)]!.visibility, 0);
  const left = score("left");
  const right = score("right");
  if (current === "left") return right > left + SIDE_SWITCH_MARGIN ? "right" : "left";
  if (current === "right") return left > right + SIDE_SWITCH_MARGIN ? "left" : "right";
  return left >= right ? "left" : "right";
}

function inFrame(p: Point): boolean {
  return p.x >= -FRAME_MARGIN && p.x <= 1 + FRAME_MARGIN && p.y >= -FRAME_MARGIN && p.y <= 1 + FRAME_MARGIN;
}

/** Joints that are not confidently visible inside the frame. */
export function missingJoints(image: Point[], joints: readonly Joint[], sides: readonly Side[], minVisibility: number): Joint[] {
  return joints.filter((joint) =>
    sides.some((side) => {
      const p = image[jointIndex(joint, side)]!;
      return p.visibility < minVisibility || !inFrame(p);
    }),
  );
}

/** A short, actionable instruction for the most important missing body part. */
export function framingGuidance(missing: readonly Joint[]): string {
  if (missing.includes("ankle") || missing.includes("knee")) return "Step back so your legs and feet are in frame";
  if (missing.includes("wrist") || missing.includes("elbow")) return "Move so your arms stay in frame";
  return "Move into the centre of the frame";
}
