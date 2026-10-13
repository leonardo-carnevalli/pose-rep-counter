/**
 * Captures the README images from replay mode, so no camera is needed.
 * Needs a running server (npm run build && npm run start -- -p 3123) and ffmpeg on PATH for the GIF.
 * Usage: npm run screenshots
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, devices, type Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3123";
const OUT = join(process.cwd(), "docs");
mkdirSync(OUT, { recursive: true });

const waitForReps = (page: Page, reps: number) =>
  page.getByTestId("rep-count").filter({ hasText: new RegExp(`^${reps}$`) }).waitFor({ timeout: 60_000 });

const browser = await chromium.launch();

// Desktop: live stage with a form cue on screen, then the set summary.
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
  await page.goto(`${BASE_URL}/?replay=squat`);
  await page.locator("ul[aria-live] li").first().waitFor({ timeout: 60_000 });
  await page.waitForTimeout(250);
  await page.screenshot({ path: join(OUT, "live-squat.png") });
  await page.getByRole("region", { name: /set summary/i }).waitFor({ timeout: 60_000 });
  await page.getByRole("region", { name: /set summary/i }).screenshot({ path: join(OUT, "summary.png") });
  await page.close();
}

// Mobile: push-ups mid-set.
{
  const context = await browser.newContext({ ...devices["Pixel 7"] });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/?replay=pushup`);
  await waitForReps(page, 2);
  await page.waitForTimeout(900);
  await page.screenshot({ path: join(OUT, "mobile-pushup.png") });
  await context.close();
}

// GIF: record the stage during a few squats and convert with ffmpeg.
{
  const videoDir = mkdtempSync(join(tmpdir(), "pose-rep-counter-"));
  const context = await browser.newContext({ viewport: { width: 960, height: 640 }, recordVideo: { dir: videoDir, size: { width: 960, height: 640 } } });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/?replay=squat`);
  await waitForReps(page, 4);
  await context.close();
  const webm = join(videoDir, readdirSync(videoDir)[0]!);
  const filter = "fps=12,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer";
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", "1.5", "-i", webm, "-vf", filter, join(OUT, "demo.gif")]);
  rmSync(videoDir, { recursive: true, force: true });
}

await browser.close();
console.log(`Saved images to ${OUT}`);
