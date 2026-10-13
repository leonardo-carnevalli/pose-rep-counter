import { describe, expect, it } from "vitest";
import { createRandom } from "@/lib/sim/random";
import { createOneEuro } from "./one-euro";

const std = (values: number[]) => {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length);
};

describe("One Euro filter", () => {
  it("passes a constant signal through unchanged", () => {
    const filter = createOneEuro();
    for (let i = 0; i < 30; i++) expect(filter(120, i / 30)).toBeCloseTo(120);
  });

  it("removes most jitter from a held position", () => {
    const filter = createOneEuro();
    const rng = createRandom(7);
    const raw: number[] = [];
    const smoothed: number[] = [];
    for (let i = 0; i < 300; i++) {
      const x = 150 + rng.gaussian(4);
      raw.push(x);
      smoothed.push(filter(x, i / 30));
    }
    expect(std(smoothed.slice(30))).toBeLessThan(std(raw.slice(30)) / 2);
  });

  it("follows a real movement with little lag", () => {
    const filter = createOneEuro();
    let out = 0;
    for (let i = 0; i <= 30; i++) out = filter(i < 5 ? 170 : 90, i / 30);
    expect(out).toBeLessThan(95);
  });

  it("restarts cleanly when time goes backwards (a new set)", () => {
    const filter = createOneEuro();
    filter(10, 1);
    expect(filter(50, 0)).toBe(50);
  });
});
