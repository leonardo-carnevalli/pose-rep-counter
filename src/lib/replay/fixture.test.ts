import { describe, expect, it } from "vitest";
import { LM } from "@/lib/pose/landmarks";
import { simulateSet } from "@/lib/sim/simulate";
import { decodeFixture, encodeFixture, type Fixture } from "./fixture";

describe("fixture encoding", () => {
  const frames = simulateSet({ exercise: "squat", seed: 4, reps: [{}], dropouts: [{ afterRep: 1, seconds: 0.2, kind: "no-pose" }] });
  const fixture: Fixture = { name: "test", exercise: "squat", aspect: 16 / 9, expected: { reps: 1, cues: {} }, frames };

  it("round-trips through JSON with rounded landmarks", () => {
    const decoded = decodeFixture(JSON.parse(JSON.stringify(encodeFixture(fixture))));
    expect(decoded.frames).toHaveLength(frames.length);
    const original = frames[10]!;
    const copy = decoded.frames[10]!;
    expect(copy.image![LM.leftKnee]!.x).toBeCloseTo(original.image![LM.leftKnee]!.x, 3);
    expect(copy.world![LM.leftKnee]!.z).toBeCloseTo(original.world![LM.leftKnee]!.z, 2);
    expect(copy.world![LM.leftKnee]!.visibility).toBe(copy.image![LM.leftKnee]!.visibility);
    expect(decoded.frames.some((f) => f.image === null)).toBe(true);
  });

  it("rejects malformed input", () => {
    expect(() => decodeFixture(null)).toThrow();
    expect(() => decodeFixture({ name: "x", exercise: "deadlift" })).toThrow(/unknown exercise/);
    expect(() => decodeFixture({ ...encodeFixture(fixture), frames: [[0, [1, 2], null]] })).toThrow(/malformed frame/);
  });
});
