import type { ExerciseConfig, ExerciseId } from "./types";

/**
 * Every number the engine uses to count reps and give form cues lives here.
 * Angles are interior joint angles in degrees: 180 is a straight limb.
 */
const squat: ExerciseConfig = {
  id: "squat",
  name: "Squat",
  setup: "Stand side-on to the camera with your whole body in frame.",
  view: "side",
  sides: "near",
  requiredJoints: ["shoulder", "hip", "knee", "ankle"],
  features: {
    knee: { label: "Knee", unit: "°", anchor: "knee", compute: (b) => b.angle("hip", "knee", "ankle") },
    hip: { label: "Hip", unit: "°", anchor: "hip", compute: (b) => b.angle("shoulder", "hip", "knee") },
    torsoLean: { label: "Torso lean", unit: "°", compute: (b) => b.lean("hip", "shoulder") },
  },
  primary: "knee",
  thresholds: { rest: 160, peak: 115 },
  fullRange: { rest: 170, peak: 80 },
  cues: [
    { id: "depth", message: "Sink deeper: aim for thighs about parallel", feature: "knee", aggregate: "min", op: ">", threshold: 100 },
    { id: "chest", message: "Keep your chest up", feature: "torsoLean", aggregate: "max", op: ">", threshold: 45 },
  ],
};

const pushup: ExerciseConfig = {
  id: "pushup",
  name: "Push-up",
  setup: "Place the camera at floor level, side-on, so shoulders to ankles are visible.",
  view: "side",
  sides: "near",
  requiredJoints: ["shoulder", "elbow", "wrist", "hip", "ankle"],
  features: {
    elbow: { label: "Elbow", unit: "°", anchor: "elbow", compute: (b) => b.angle("shoulder", "elbow", "wrist") },
    bodyLine: { label: "Body line", unit: "°", anchor: "hip", compute: (b) => b.angle("shoulder", "hip", "ankle") },
  },
  primary: "elbow",
  thresholds: { rest: 150, peak: 110 },
  fullRange: { rest: 165, peak: 75 },
  cues: [
    { id: "depth", message: "Lower your chest closer to the floor", feature: "elbow", aggregate: "min", op: ">", threshold: 100 },
    { id: "hips", message: "Keep hips in line with shoulders and ankles", feature: "bodyLine", aggregate: "min", op: "<", threshold: 160 },
  ],
};

const curl: ExerciseConfig = {
  id: "curl",
  name: "Biceps curl",
  setup: "Side-on works best. The arm nearest the camera is counted.",
  view: "any",
  sides: "near",
  requiredJoints: ["shoulder", "elbow", "wrist", "hip"],
  features: {
    elbow: { label: "Elbow", unit: "°", anchor: "elbow", compute: (b) => b.angle("shoulder", "elbow", "wrist") },
    upperArm: { label: "Upper arm", unit: "°", anchor: "shoulder", compute: (b) => b.angle("hip", "shoulder", "elbow") },
    torsoLean: { label: "Torso lean", unit: "°", compute: (b) => b.lean("hip", "shoulder") },
  },
  primary: "elbow",
  thresholds: { rest: 140, peak: 70 },
  fullRange: { rest: 165, peak: 35 },
  cues: [
    { id: "top", message: "Squeeze all the way to the top", feature: "elbow", aggregate: "min", op: ">", threshold: 60 },
    { id: "elbow", message: "Keep your elbow tucked at your side", feature: "upperArm", aggregate: "max", op: ">", threshold: 35 },
    { id: "swing", message: "Stay tall, no swinging", feature: "torsoLean", aggregate: "max", op: ">", threshold: 15 },
  ],
};

const jumpingJack: ExerciseConfig = {
  id: "jumping-jack",
  name: "Jumping jack",
  setup: "Face the camera and step back until your hands and feet fit in frame.",
  view: "front",
  sides: "both",
  requiredJoints: ["shoulder", "wrist", "hip", "ankle"],
  features: {
    arms: {
      label: "Arms",
      unit: "°",
      anchor: "shoulder",
      compute: (b) => (b.angle("hip", "shoulder", "wrist", "left") + b.angle("hip", "shoulder", "wrist", "right")) / 2,
    },
    feet: { label: "Feet", unit: "×", compute: (b) => b.spread("ankle") },
  },
  primary: "arms",
  thresholds: { rest: 45, peak: 120 },
  fullRange: { rest: 20, peak: 170 },
  cues: [
    { id: "overhead", message: "Bring your hands all the way overhead", feature: "arms", aggregate: "max", op: "<", threshold: 150 },
    { id: "feet", message: "Jump your feet wider", feature: "feet", aggregate: "max", op: "<", threshold: 1.4 },
  ],
};

export const EXERCISES: Record<ExerciseId, ExerciseConfig> = {
  squat,
  pushup,
  curl,
  "jumping-jack": jumpingJack,
};

export const EXERCISE_IDS = Object.keys(EXERCISES) as ExerciseId[];

export function isExerciseId(value: string): value is ExerciseId {
  return value in EXERCISES;
}
