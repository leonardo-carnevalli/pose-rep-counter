/**
 * Writes the synthetic replay fixtures to public/fixtures. Deterministic: same seeds, same files.
 * Usage: npm run fixtures
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { encodeFixture } from "@/lib/replay/fixture";
import { FIXTURE_PLANS } from "@/lib/sim/plans";
import { simulateSet } from "@/lib/sim/simulate";

const outDir = join(process.cwd(), "public", "fixtures");
mkdirSync(outDir, { recursive: true });

for (const { name, plan, expected } of FIXTURE_PLANS) {
  const frames = simulateSet(plan);
  const json = JSON.stringify(encodeFixture({ name, exercise: plan.exercise, aspect: plan.aspect ?? 16 / 9, expected, frames }));
  writeFileSync(join(outDir, `${name}.json`), json);
  console.log(`${name}: ${frames.length} frames, ${(json.length / 1024).toFixed(0)} KB`);
}
