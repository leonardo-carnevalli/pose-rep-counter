import type { Fixture } from "@/lib/replay/fixture";
import type { RepPlan, SetPlan } from "./simulate";

export interface FixturePlan {
  name: string;
  plan: SetPlan;
  expected: Fixture["expected"];
}

const good = (count: number, duration?: number): RepPlan[] => Array.from({ length: count }, () => ({ duration }));

/**
 * The scripted sets behind public/fixtures. Each one mixes clean reps with deliberate faults and
 * tracking gaps, and states the exact reps and cues a correct engine must report.
 */
export const FIXTURE_PLANS: FixturePlan[] = [
  {
    name: "squat-side",
    plan: {
      exercise: "squat",
      seed: 11,
      reps: [...good(2), { shape: { depth: 108 } }, ...good(1), { shape: { lean: 20 } }, ...good(1), { shape: { depth: 108 } }, ...good(1)],
      dropouts: [
        { afterRep: 4, seconds: 0.7, kind: "legs-hidden" },
        { afterRep: 6, seconds: 0.4, kind: "no-pose" },
      ],
    },
    expected: { reps: 8, cues: { depth: 2, chest: 1 } },
  },
  {
    name: "pushup-side",
    plan: {
      exercise: "pushup",
      seed: 23,
      reps: [...good(2), { shape: { depth: 105 } }, ...good(1), { shape: { sag: 0.15 } }, { shape: { sag: 0.15 } }],
    },
    expected: { reps: 6, cues: { depth: 1, hips: 2 } },
  },
  {
    name: "curl-side",
    plan: {
      exercise: "curl",
      seed: 37,
      reps: [...good(3), { shape: { drift: 45 } }, ...good(1), { shape: { swing: 22 } }, { shape: { top: 64 } }, ...good(1)],
      dropouts: [{ afterRep: 5, seconds: 0.5, kind: "no-pose" }],
    },
    expected: { reps: 8, cues: { elbow: 1, swing: 1, top: 1 } },
  },
  {
    name: "jumping-jack-front",
    plan: {
      exercise: "jumping-jack",
      seed: 53,
      reps: [...good(3, 1.1), { duration: 1.1, shape: { arms: 135 } }, ...good(3, 1.1), { duration: 1.1, shape: { feet: 0.2 } }, ...good(2, 1.1)],
    },
    expected: { reps: 10, cues: { overhead: 1, feet: 1 } },
  },
];
