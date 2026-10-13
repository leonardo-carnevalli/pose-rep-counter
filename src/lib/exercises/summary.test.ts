import { describe, expect, it } from "vitest";
import type { RepRecord } from "./rep-engine";
import { summarize } from "./summary";

const rep = (index: number, tempo: number, rom: number, cues: string[] = []): RepRecord => ({
  index,
  tempo,
  rom,
  cues: cues.map((id) => ({ id, message: id, value: 0 })),
});

describe("summarize", () => {
  it("averages tempo and range of motion and ranks cues by frequency", () => {
    const summary = summarize("squat", new Date("2026-10-13T10:00:00Z"), [
      rep(1, 2, 100),
      rep(2, 2.5, 80, ["depth"]),
      rep(3, 2.25, 90, ["depth", "chest"]),
    ]);
    expect(summary).toMatchObject({ reps: 3, avgTempo: 2.25, avgRom: 90, startedAt: "2026-10-13T10:00:00.000Z" });
    expect(summary.cues).toEqual([
      { id: "depth", message: "depth", count: 2 },
      { id: "chest", message: "chest", count: 1 },
    ]);
    expect(summary.perRep).toHaveLength(3);
  });

  it("reports empty sets without dividing by zero", () => {
    expect(summarize("curl", new Date(0), [])).toMatchObject({ reps: 0, avgTempo: null, avgRom: null, cues: [] });
  });
});
