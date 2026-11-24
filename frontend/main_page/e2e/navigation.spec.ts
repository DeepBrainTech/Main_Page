import en from "../language/en.json";
import zh from "../language/zh.json";
import { test, expect } from "./fixtures";

test("desktop sidebar fills the viewport below the header while page content scrolls", async ({ page, isMobile }) => {
  await page.goto("/en/learning", { waitUntil: "domcontentloaded" });
  const sidebar = page.getByRole("complementary", { name: en.nav.home, includeHidden: true });
  if (isMobile) {
    await expect(sidebar).toBeHidden();
    return;
  }

  await expect(sidebar).toBeVisible();
  const panel = sidebar.locator(":scope > div");
  const main = page.getByRole("main");
  const panelBottom = async () => {
    const bounds = (await panel.boundingBox())!;
    return bounds.y + bounds.height;
  };
  for (const { width, height } of [{ width: 1920, height: 1024 }, { width: 1280, height: 540 }]) {
    await page.setViewportSize({ width, height });
    await expect.poll(panelBottom).toBeCloseTo(height - 24, 0);
    const panelBounds = (await panel.boundingBox())!;
    expect(panelBounds.x).toBe(24);
    expect(panelBounds.width).toBe(271);
    const contentLeft = await main.evaluate((element) =>
      element.getBoundingClientRect().left + Number.parseFloat(getComputedStyle(element).paddingLeft),
    );
    expect(contentLeft - panelBounds.x - panelBounds.width).toBe(24);
  }

  const header = page.locator("header");
  const dashboardLink = sidebar.getByRole("link", { name: en.dashboard.dashboardTab });
  const linkBox = (await dashboardLink.boundingBox())!;
  const iconBox = (await dashboardLink.locator("img").boundingBox())!;
  const label = dashboardLink.locator("span");
  const labelBox = (await label.boundingBox())!;
  expect(linkBox.height).toBe(44);
  expect(iconBox.width).toBe(20);
  expect(iconBox.x - linkBox.x).toBe(24);
  expect(labelBox.x - iconBox.x - iconBox.width).toBe(18);
  expect(await label.evaluate((element) => parseFloat(getComputedStyle(element).letterSpacing))).toBeCloseTo(-0.1504, 4);

  const initialSidebar = (await sidebar.boundingBox())!;
  const initialMain = (await main.boundingBox())!;
  expect(initialSidebar.y).toBe((await header.boundingBox())!.height);

  await page.mouse.move(initialMain.x + initialMain.width / 2, 300);
  await page.mouse.wheel(0, 400);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  expect((await main.boundingBox())!.y).toBeLessThan(initialMain.y);
  expect((await sidebar.boundingBox())!.y).toBeCloseTo(initialSidebar.y, 0);
  await expect(dashboardLink).toBeInViewport();

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(async () => (await sidebar.boundingBox())!.y).toBeCloseTo(initialSidebar.y, 0);
  await expect.poll(panelBottom).toBeCloseTo(540 - 24, 0);
});

test("Dashboard arranges its four statistics and content cards for the viewport", async ({ page, isMobile }) => {
  if (!isMobile) await page.setViewportSize({ width: 1920, height: 1024 });
  await page.goto("/en/dashboard", { waitUntil: "domcontentloaded" });
  const main = page.getByRole("main");
  const stats = main.locator(":scope > div > section").first().locator(":scope > div");
  await expect(stats).toHaveCount(4);
  await expect(stats.nth(3)).toContainText(en.dashboard.level);
  await expect(main.getByText(en.dashboard.checkInDaysChecked, { exact: true })).toBeVisible();
  await expect(main.locator("dl dd").first()).toHaveText("28");

  const chat = main.getByRole("button", { name: en.dashboard.wukooCloseChat });
  const background = main.getByRole("button", { name: /Background/ }).first();
  const firstStat = (await stats.first().boundingBox())!;
  const lastStat = (await stats.last().boundingBox())!;
  const brainpower = (await main.locator("[data-brainpower-panel]").boundingBox())!;
  const calendar = (await main.getByRole("heading", { name: en.dashboard.checkInTitle }).boundingBox())!;
  const tasks = (await main.getByRole("heading", { name: en.tasks.title }).boundingBox())!;

  if (isMobile) {
    expect(lastStat.y).toBeGreaterThan(firstStat.y);
    expect(tasks.y).toBeGreaterThan(calendar.y);
    expect(brainpower.y).toBeGreaterThan(tasks.y);
    await expect(chat).toBeHidden();
    await expect(background).toHaveAttribute("aria-expanded", "false");
    return;
  }

  expect(lastStat.y).toBe(firstStat.y);
  expect(firstStat.height).toBe(135);
  expect(brainpower.y).toBe(firstStat.y + firstStat.height + 24);
  expect(brainpower.x).toBeGreaterThan(tasks.x);
  expect(tasks.y).toBeCloseTo(calendar.y, 0);
  await expect(chat).toBeVisible();
  await expect(background).toHaveAttribute("aria-expanded", "false");
  await chat.click();
  await expect(chat).toBeHidden();
  await background.click();
  await expect(background).toHaveAttribute("aria-expanded", "true");
  await background.click();
  await expect(background).toHaveAttribute("aria-expanded", "false");
});

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

test("game details preserve the source category with browser back", async ({ page }) => {
  await page.goto("/en/braingames", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: en.brainGames.categoryChip.logic, exact: true }).click();
  await expect(page).toHaveURL("/en/braingames?category=logic");
  await page.getByRole("link", { name: en.dashboard.sudoku, exact: true }).click();
  await expect(page).toHaveURL("/en/braingames/sudoku?category=logic");
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL("/en/braingames/sudoku?category=logic");
  await expect(page.getByRole("link", { name: "Back to Games", exact: true })).toHaveCount(0);
  await page.goBack({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL("/en/braingames?category=logic");
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

test("main content fits the viewport on stable pages", async ({ page, waitForPageRequests }) => {
  for (const path of ["learning", "leaderboard", "braingames", "test"]) {
    await page.goto(`/en/${path}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("main button").first()).toBeVisible();
    expect(await page.locator("main").evaluate((element) => element.scrollWidth <= element.clientWidth + 1), path).toBe(true);
    // Finish route prefetches before the next hard navigation unloads this page.
    await waitForPageRequests();
  }
});
