/** One body landmark. Image landmarks are normalised to [0, 1]; world landmarks are in metres. */
export interface Point {
  x: number;
  y: number;
  z: number;
  /** Model confidence that the point is visible, 0..1. */
  visibility: number;
}

/** A single detected pose at time `t` (seconds). */
export interface PoseFrame {
  t: number;
  /** 33 BlazePose landmarks in normalised image coordinates, or null when nobody is detected. */
  image: Point[] | null;
  /** The same 33 landmarks in metric world coordinates centred on the hips, when available. */
  world: Point[] | null;
}

export const LANDMARK_COUNT = 33;

/** BlazePose indices for the joints the exercise engine uses. */
export const LM = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const;

export type Joint = "shoulder" | "elbow" | "wrist" | "hip" | "knee" | "ankle";
export type Side = "left" | "right";

export function jointIndex(joint: Joint, side: Side): number {
  const key = `${side}${joint[0]!.toUpperCase()}${joint.slice(1)}` as keyof typeof LM;
  return LM[key];
}

/** Skeleton edges drawn by the overlay (a trimmed version of MediaPipe's POSE_CONNECTIONS). */
export const SKELETON: ReadonlyArray<readonly [number, number]> = [
  [LM.leftShoulder, LM.rightShoulder],
  [LM.leftShoulder, LM.leftElbow],
  [LM.leftElbow, LM.leftWrist],
  [LM.rightShoulder, LM.rightElbow],
  [LM.rightElbow, LM.rightWrist],
  [LM.leftShoulder, LM.leftHip],
  [LM.rightShoulder, LM.rightHip],
  [LM.leftHip, LM.rightHip],
  [LM.leftHip, LM.leftKnee],
  [LM.leftKnee, LM.leftAnkle],
  [LM.rightHip, LM.rightKnee],
  [LM.rightKnee, LM.rightAnkle],
];
