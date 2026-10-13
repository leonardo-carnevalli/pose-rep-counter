import { describe, expect, it } from "vitest";
import { EXERCISES, isExerciseId } from "./catalog";

describe.each(Object.values(EXERCISES))("$name config", (config) => {
  it("drives the counter from a defined feature", () => {
    expect(config.features[config.primary]).toBeDefined();
  });

  it("puts the hysteresis band inside the full range, in the same direction", () => {
    const { rest, peak } = config.thresholds;
    const full = config.fullRange;
    const sign = Math.sign(full.peak - full.rest);
    expect(Math.sign(peak - rest)).toBe(sign);
    expect((rest - full.rest) * sign).toBeGreaterThan(0);
    expect((full.peak - peak) * sign).toBeGreaterThan(0);
  });

  it("only writes cue rules against defined features, with unique ids", () => {
    for (const cue of config.cues) expect(config.features[cue.feature]).toBeDefined();
    expect(new Set(config.cues.map((c) => c.id)).size).toBe(config.cues.length);
  });
});

describe("isExerciseId", () => {
  it("accepts known ids only", () => {
    expect(isExerciseId("squat")).toBe(true);
    expect(isExerciseId("deadlift")).toBe(false);
  });
});
