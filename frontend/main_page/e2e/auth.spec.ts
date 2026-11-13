import en from "../language/en.json";
import zh from "../language/zh.json";
import { test, expect } from "./fixtures";

for (const [locale, messages] of [["en", en], ["zh", zh]] as const) {
  test(`${locale}: login returns to the requested page and replaces the login entry`, async ({ page, api }) => {
    api.signedIn = false;
    await page.goto(`/${locale}/forgot-password`, { waitUntil: "domcontentloaded" });
    await page.goto(`/${locale}/leaderboard?tab=dimension#ranking`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(new RegExp(`/${locale}/login\\?returnTo=`));
    expect(new URL(page.url()).searchParams.get("returnTo")).toBe("/leaderboard?tab=dimension#ranking");
    await page.locator("#username").fill("ci-user");
    await page.locator("#password").fill("ci-password");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(`/${locale}/leaderboard?tab=dimension#ranking`);
    await expect(page.getByRole("button", { name: messages.leaderboard.tabByDimension, exact: true })).toBeVisible();
    await page.goBack({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(`/${locale}/forgot-password`);
  });

  test(`${locale}: logo opens Dashboard and Logout returns to Landing`, async ({ page, api }) => {
    await page.goto(`/${locale}/learning`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: messages.learning.home.coursesHeading, exact: true })).toBeVisible();
    await page.locator("header").getByRole("link", { name: messages.dashboard.dashboardTab, exact: true }).click();
    await expect(page).toHaveURL(`/${locale}/dashboard`);
    await page.getByRole("button", { name: messages.nav.profile, exact: true }).click();
    await page.getByRole("button", { name: messages.common.logout, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/?$`));
    await expect(page.getByRole("button", { name: messages.common.login, exact: true })).toBeVisible();
    expect(api.logoutCalls).toBe(1);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: messages.common.login, exact: true })).toBeVisible();
  });
}

test("login does not follow an external return address", async ({ page, api }) => {
  api.signedIn = false;
  await page.goto("/en/login?returnTo=%2F%2Foutside.example.test", { waitUntil: "domcontentloaded" });
  await page.locator("#username").fill("ci-user");
  await page.locator("#password").fill("ci-password");
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL("/en/dashboard");
});

test("registration and password recovery retain the original destination", async ({ page, api }) => {
  api.signedIn = false;
  const returnTo = "/braingames/fogchess?category=memory";
  await page.goto(`/en/login?returnTo=${encodeURIComponent(returnTo)}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: en.login.registerLink, exact: true }).click();
  await expect(page).toHaveURL(/\/en\/register\?returnTo=/);
  expect(new URL(page.url()).searchParams.get("returnTo")).toBe(returnTo);
  await page.getByRole("button", { name: en.register.loginLink, exact: true }).click();
  await page.getByRole("button", { name: en.login.forgotPassword, exact: true }).click();
  await expect(page).toHaveURL(/\/en\/forgot-password\?returnTo=/);
  expect(new URL(page.url()).searchParams.get("returnTo")).toBe(returnTo);
});

test("the authenticated Landing redirect does not trap browser Back", async ({ page }) => {
  await page.goto("/en/forgot-password", { waitUntil: "domcontentloaded" });
  await page.goto("/en", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL("/en/dashboard");
  await expect(page.locator("main")).toBeVisible();
  // Let mounted UI requests and route prefetches finish before unloading the document.
  // WebKit can report interrupted requests as access-control page errors.
  await page.waitForLoadState("networkidle");
  await page.goBack({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL("/en/forgot-password");
});
