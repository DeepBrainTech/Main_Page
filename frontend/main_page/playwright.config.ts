import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:3100";
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    serviceWorkers: "block",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], launchOptions: { executablePath } } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"], launchOptions: { executablePath } } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: "npm run test:e2e:serve",
    url: `${baseURL}/en/login`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: { HOSTNAME: "127.0.0.1", PORT: "3100" },
  },
});
