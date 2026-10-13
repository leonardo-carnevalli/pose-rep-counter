import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { decodeFixture } from "@/lib/replay/fixture";
import { FIXTURE_PLANS } from "@/lib/sim/plans";
import { simulateSet, type SetPlan } from "@/lib/sim/simulate";
import { EXERCISES } from "./catalog";
import { createRepEngine } from "./rep-engine";
import { countCues, runFrames } from "./run";

const ASPECT = 16 / 9;
const loadFixture = (name: string) => decodeFixture(JSON.parse(readFileSync(join(process.cwd(), "public", "fixtures", `${name}.json`), "utf8")));

describe.each(FIXTURE_PLANS.map((p) => p.name))("fixture %s", (name) => {
  const fixture = loadFixture(name);

  it.each([
    ["3D world", true],
    ["2D image", false],
  ])("counts the exact reps and cues from %s landmarks", (_label, useWorld) => {
    const reps = runFrames(fixture.exercise, fixture.frames, { aspect: fixture.aspect, useWorld });
    expect(reps).toHaveLength(fixture.expected.reps);
    expect(countCues(reps)).toEqual(fixture.expected.cues);
  });

  it("reports a plausible tempo and range of motion for every rep", () => {
    for (const rep of runFrames(fixture.exercise, fixture.frames, { aspect: fixture.aspect })) {
      expect(rep.tempo).toBeGreaterThan(0.5);
      expect(rep.tempo).toBeLessThan(3);
      expect(rep.rom).toBeGreaterThan(50);
      expect(rep.rom).toBeLessThanOrEqual(100);
    }
  });
});

describe("hysteresis and jitter", () => {
  const squats = (depth: number, count: number, image = 0.006): SetPlan => ({
    exercise: "squat",
    seed: 5,
    noise: { image, world: image * 2.5 },
    reps: Array.from({ length: count }, () => ({ duration: 3, shape: { depth } })),
  });

  it("never double counts reps whose bottom sits right on the peak threshold", () => {
    // Bottom at 113 degrees against a 115 threshold: noise crosses it back and forth every rep.
    expect(runFrames("squat", simulateSet(squats(113, 6)), { aspect: ASPECT })).toHaveLength(6);
  });

  it("ignores wobbling around the rest threshold", () => {
    // Bottom at 157 against a rest threshold of 160: the knee leaves rest, then comes back, but never reaches the peak.
    expect(runFrames("squat", simulateSet(squats(157, 6)), { aspect: ASPECT })).toHaveLength(0);
  });

  it("does not count half reps", () => {
    expect(runFrames("squat", simulateSet(squats(135, 4)), { aspect: ASPECT })).toHaveLength(0);
  });

  it("would double count without the hysteresis gap", () => {
    // A single threshold (rest = peak) is the naive design the band replaces.
    const naive = { ...EXERCISES.squat, thresholds: { rest: 113, peak: 112 } };
    const engine = createRepEngine(naive, { aspect: ASPECT, smoothing: null });
    const reps = simulateSet(squats(113, 6, 0.01)).filter((f) => engine.push(f).completed).length;
    expect(reps).toBeGreaterThan(6);
  });
});

describe("tracking gates", () => {
  it("pauses on a missing person and asks them to step in", () => {
    const engine = createRepEngine(EXERCISES.squat, { aspect: ASPECT });
    expect(engine.push({ t: 0, image: null, world: null })).toMatchObject({ status: "no-pose", reps: 0, guidance: expect.stringMatching(/step into view/i) });
  });

  it("asks for a side view when a side-view exercise is filmed from the front", () => {
    const engine = createRepEngine(EXERCISES.squat, { aspect: ASPECT });
    const front = simulateSet({ exercise: "jumping-jack", seed: 2, reps: [] })[0]!;
    expect(engine.push(front)).toMatchObject({ status: "adjust", guidance: "Turn side-on to the camera" });
  });

  it("holds the count while the legs are out of frame and resumes after", () => {
    const frames = simulateSet({ exercise: "squat", seed: 9, reps: [{}, {}], dropouts: [{ afterRep: 1, seconds: 1, kind: "legs-hidden" }] });
    const engine = createRepEngine(EXERCISES.squat, { aspect: ASPECT });
    const results = frames.map((f) => engine.push(f));
    const adjusting = results.filter((r) => r.status === "adjust");
    expect(adjusting.length).toBeGreaterThan(20);
    expect(adjusting.every((r) => r.reps === 1 && /step back/i.test(r.guidance ?? ""))).toBe(true);
    expect(results.at(-1)!.reps).toBe(2);
  });

  it("labels joint angles on the measured side while tracking", () => {
    const engine = createRepEngine(EXERCISES.squat, { aspect: ASPECT });
    const result = engine.push(simulateSet({ exercise: "squat", seed: 3, reps: [] })[0]!);
    expect(result.side).toBe("left");
    expect(result.labels.map((l) => l.text)).toEqual([expect.stringMatching(/^1[67]\d°$/), expect.stringMatching(/°$/)]);
  });
});
