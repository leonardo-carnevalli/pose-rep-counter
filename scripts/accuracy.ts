/**
 * Measures the engine on synthetic sets: exact rep count and cue agreement on the fixtures with
 * 3D world and 2D image landmarks, then a noise sweep over many seeds.
 * Usage: npm run accuracy
 */
import { countCues, runFrames } from "@/lib/exercises/run";
import { FIXTURE_PLANS } from "@/lib/sim/plans";
import { simulateSet } from "@/lib/sim/simulate";

const sameCues = (a: Record<string, number>, b: Record<string, number>) =>
  Object.keys({ ...a, ...b }).every((key) => (a[key] ?? 0) === (b[key] ?? 0));

console.log("| Fixture | Expected reps | 3D reps | 2D reps | Cues match (3D / 2D) |");
console.log("| --- | --- | --- | --- | --- |");
for (const { name, plan, expected } of FIXTURE_PLANS) {
  const frames = simulateSet(plan);
  const aspect = plan.aspect ?? 16 / 9;
  const world = runFrames(plan.exercise, frames, { aspect });
  const image = runFrames(plan.exercise, frames, { aspect, useWorld: false });
  const cues = [world, image].map((reps) => (sameCues(countCues(reps), expected.cues) ? "yes" : "no")).join(" / ");
  console.log(`| ${name} | ${expected.reps} | ${world.length} | ${image.length} | ${cues} |`);
}

const SEEDS = 25;
const LEVELS = [0.005, 0.01, 0.02, 0.03, 0.05];
console.log(`\nNoise sweep on 2D image landmarks, ${SEEDS} random sets per cell.`);
console.log("Each cell: share of sets with the exact rep count, One Euro smoothing on / off.\n");
console.log(`| Exercise | ${LEVELS.map((s) => `σ = ${s}`).join(" | ")} |`);
console.log(`| --- | ${LEVELS.map(() => "---").join(" | ")} |`);
for (const { plan, expected } of FIXTURE_PLANS) {
  const cells = LEVELS.map((sigma) => {
    const exact = { on: 0, off: 0 };
    for (let seed = 1; seed <= SEEDS; seed++) {
      const frames = simulateSet({ ...plan, seed: seed * 101, noise: { image: sigma, world: sigma * 2.5 } });
      const options = { aspect: plan.aspect ?? 16 / 9, useWorld: false };
      if (runFrames(plan.exercise, frames, options).length === expected.reps) exact.on++;
      if (runFrames(plan.exercise, frames, { ...options, smoothing: null }).length === expected.reps) exact.off++;
    }
    const pct = (n: number) => `${Math.round((n / SEEDS) * 100)}%`;
    return `${pct(exact.on)} / ${pct(exact.off)}`;
  });
  console.log(`| ${plan.exercise} | ${cells.join(" | ")} |`);
}
