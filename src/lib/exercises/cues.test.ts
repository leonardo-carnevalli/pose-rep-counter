import { describe, expect, it } from "vitest";
import { evaluateCues } from "./cues";
import type { CueRule } from "./types";

const rules: CueRule[] = [
  { id: "depth", message: "Go deeper", feature: "knee", aggregate: "min", op: ">", threshold: 100 },
  { id: "chest", message: "Chest up", feature: "lean", aggregate: "max", op: ">", threshold: 45 },
  { id: "arms", message: "Arms overhead", feature: "arms", aggregate: "max", op: "<", threshold: 150 },
];

describe("evaluateCues", () => {
  it("fires nothing on a clean rep", () => {
    expect(evaluateCues(rules, { knee: { min: 80, max: 172 }, lean: { min: 8, max: 38 }, arms: { min: 20, max: 170 } })).toEqual([]);
  });

  it("compares the right aggregate against each threshold", () => {
    const hits = evaluateCues(rules, { knee: { min: 108, max: 172 }, lean: { min: 8, max: 58 }, arms: { min: 20, max: 140 } });
    expect(hits.map((h) => h.id)).toEqual(["depth", "chest", "arms"]);
    expect(hits[0]).toEqual({ id: "depth", message: "Go deeper", value: 108 });
  });

  it("treats the threshold itself as passing", () => {
    expect(evaluateCues(rules, { knee: { min: 100, max: 170 } })).toEqual([]);
  });

  it("ignores rules whose feature was never measured", () => {
    expect(evaluateCues(rules, {})).toEqual([]);
  });
});
