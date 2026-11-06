import en from "../language/en.json";
import zh from "../language/zh.json";
import { test, expect } from "./fixtures";

test("course filters survive refresh, Back and Forward while preserving other URL state", async ({ page }) => {
  await page.goto("/en/learning?source=smoke#resources", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Language", exact: true }).click();
  await expect(page).toHaveURL("/en/learning?source=smoke&category=language#resources");
  await expect(page.getByRole("status")).toHaveText(en.learning.home.noCourses);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Language", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Math", exact: true }).click();
  await expect(page).toHaveURL("/en/learning?source=smoke&category=math#resources");
  await page.goBack({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Language", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.goForward({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Math", exact: true })).toHaveAttribute("aria-pressed", "true");
  const length = await page.evaluate(() => history.length);
  await page.getByRole("button", { name: "Math", exact: true }).click();
  expect(await page.evaluate(() => history.length)).toBe(length);
});

test("leaderboard tabs restore after refresh and browser Back", async ({ page }) => {
  await page.goto("/en/leaderboard", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: en.leaderboard.tabByDimension, exact: true }).click();
  await expect(page).toHaveURL("/en/leaderboard?tab=dimension");
  await page.reload({ waitUntil: "domcontentloaded" });
  const title = en.leaderboard.dimensionLeaderboardTitle.replace("{dimension}", en.dimensions.memory);
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  await page.getByRole("button", { name: en.leaderboard.tabGlobal, exact: true }).click();
  await expect(page).toHaveURL("/en/leaderboard");
  await page.goBack({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
});

test("game details preserve the source category on refresh and return", async ({ page }) => {
  await page.goto("/en/braingames", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: en.brainGames.categoryChip.logic, exact: true }).click();
  await expect(page).toHaveURL("/en/braingames?category=logic");
  await page.getByRole("link", { name: en.dashboard.sudoku, exact: true }).click();
  await expect(page).toHaveURL("/en/braingames/sudoku?category=logic");
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator('main a[href="/en/braingames?category=logic"]').click();
  await expect(page).toHaveURL("/en/braingames?category=logic");
  await page.goBack({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL("/en/braingames/sudoku?category=logic");
});

test("global settings close when browser Back changes the page", async ({ page }) => {
  await page.goto("/en/learning", { waitUntil: "domcontentloaded" });
  await page.locator('a[href="/en/leaderboard"]:visible').first().click();
  await expect(page).toHaveURL("/en/leaderboard");
  await page.getByRole("button", { name: en.nav.settings, exact: true }).click();
  await expect(page.getByRole("button", { name: en.settings.close, exact: true })).toBeVisible();
  await page.goBack({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL("/en/learning");
  await expect(page.getByRole("button", { name: en.settings.close, exact: true })).toBeHidden();
});

test("settings language changes preserve query and anchor without adding history", async ({ page }) => {
  await page.goto("/en/learning?category=language#resources", { waitUntil: "domcontentloaded" });
  const length = await page.evaluate(() => history.length);
  await page.getByRole("button", { name: en.nav.settings, exact: true }).click();
  await page.getByRole("button", { name: "中文", exact: true }).click();
  await page.getByRole("button", { name: en.settings.saveChanges, exact: true }).click();
  await expect(page).toHaveURL("/zh/learning?category=language#resources");
  await expect(page.getByRole("button", { name: zh.learning.home.courseCategories.language, exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => history.length)).toBe(length);
});

test("Landing language and footer navigation use real destinations", async ({ page, api }) => {
  api.signedIn = false;
  await page.goto("/en?campaign=smoke#contact", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Select language/ }).click();
  await page.getByRole("menuitem").click();
  await expect(page).toHaveURL("/zh?campaign=smoke#contact");
  await expect(page.locator('footer a[href="#"]')).toHaveCount(0);
  await expect(page.locator('footer a[href="/zh/learning"]')).toHaveCount(1);
});

test("Study Tools remain disabled and unfinished modules keep working entry points", async ({ page }) => {
  await page.goto("/en/learning", { waitUntil: "domcontentloaded" });
  const tools = page.locator('section[aria-labelledby="learning-studyTools-heading"]');
  await expect(tools.getByRole("heading", { name: en.learning.home.studyTools.ai.title, exact: true })).toBeVisible();
  await expect(tools.getByRole("heading", { name: en.learning.home.studyTools.practice.title, exact: true })).toBeVisible();
  const buttons = tools.getByRole("button");
  await expect(buttons).toHaveCount(2);
  for (const button of await buttons.all()) {
    await expect(button).toBeDisabled();
    await expect(button).toHaveText(en.learning.home.resourcesComingSoon);
  }
  await page.goto("/en/test", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: en.test.title, exact: true })).toBeVisible();
});

test("main content fits the viewport on stable pages", async ({ page }) => {
  for (const path of ["learning", "leaderboard", "braingames", "test"]) {
    await page.goto(`/en/${path}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("main button").first()).toBeVisible();
    expect(await page.locator("main").evaluate((element) => element.scrollWidth <= element.clientWidth + 1), path).toBe(true);
  }
});
