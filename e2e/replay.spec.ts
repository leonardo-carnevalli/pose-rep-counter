import { expect, test } from "@playwright/test";
import { FIXTURE_PLANS } from "../src/lib/sim/plans";

for (const { plan, expected } of FIXTURE_PLANS) {
  test(`replay counts ${expected.reps} ${plan.exercise} reps and summarises the set`, async ({ page }) => {
    await page.goto(`/?replay=${plan.exercise}&speed=4`);
    const count = page.getByTestId("rep-count");

    // The counter climbs one rep at a time: check it passes through 1 before the final number.
    await expect(count).toHaveText("1", { timeout: 15_000 });
    await expect(count).toHaveText(String(expected.reps), { timeout: 30_000 });

    const summary = page.getByRole("region", { name: /set summary/i });
    await expect(summary).toBeVisible({ timeout: 10_000 });
    await expect(summary.getByText(String(expected.reps), { exact: true }).first()).toBeVisible();
    for (const count of Object.values(expected.cues)) {
      await expect(summary.getByText(`${count} of ${expected.reps} reps`).first()).toBeVisible();
    }
    await expect(page.getByRole("region", { name: "History" })).toContainText(`${expected.reps} reps`);
  });
}

test("manual start from the controls runs the selected replay", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Jumping jack", { exact: true }).click();
  await page.getByRole("button", { name: "Start replay" }).click();
  await expect(page.getByRole("button", { name: "Finish set" })).toBeVisible();
  await expect(page.getByTestId("rep-count")).toHaveText("2", { timeout: 15_000 });
  await page.getByRole("button", { name: "Finish set" }).click();
  await expect(page.getByRole("region", { name: /set summary/i })).toBeVisible();
});
