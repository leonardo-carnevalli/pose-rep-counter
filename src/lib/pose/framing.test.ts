import { describe, expect, it } from "vitest";
import { simulateSet } from "@/lib/sim/simulate";
import { detectView, framingGuidance, missingJoints, pickSide } from "./framing";
import { LM, type Point } from "./landmarks";

const ASPECT = 16 / 9;
const firstImage = (exercise: "squat" | "jumping-jack") => simulateSet({ exercise, seed: 1, reps: [] })[0]!.image!;

describe("detectView", () => {
  it("tells a side-on squat from a front-facing jumping jack", () => {
    expect(detectView(firstImage("squat"), ASPECT)).toBe("side");
    expect(detectView(firstImage("jumping-jack"), ASPECT)).toBe("front");
  });
});

describe("pickSide", () => {
  const joints = ["shoulder", "hip", "knee", "ankle"] as const;

  it("measures the side nearest the camera", () => {
    expect(pickSide(firstImage("squat"), joints)).toBe("left");
  });

  it("keeps the current side unless the other one is clearly better", () => {
    const image = firstImage("jumping-jack").map((p) => ({ ...p }));
    expect(pickSide(image, joints, "right")).toBe("right");
    image[LM.rightKnee]!.visibility = 0.1;
    image[LM.rightAnkle]!.visibility = 0.1;
    expect(pickSide(image, joints, "right")).toBe("left");
  });
});

describe("missingJoints and guidance", () => {
  it("flags hidden or out-of-frame joints with an actionable message", () => {
    const image: Point[] = firstImage("squat").map((p) => ({ ...p }));
    expect(missingJoints(image, ["hip", "knee", "ankle"], ["left"], 0.5)).toEqual([]);

    image[LM.leftAnkle]!.y = 1.2;
    const missing = missingJoints(image, ["hip", "knee", "ankle"], ["left"], 0.5);
    expect(missing).toEqual(["ankle"]);
    expect(framingGuidance(missing)).toMatch(/step back/i);

    expect(framingGuidance(["wrist"])).toMatch(/arms/i);
    expect(framingGuidance(["shoulder"])).toMatch(/centre/i);
  });
});
