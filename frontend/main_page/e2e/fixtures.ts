import { test as base, expect, type Request } from "@playwright/test";

type ApiState = { signedIn: boolean; logoutCalls: number };

/** Browser smoke tests exercise the UI contract without real accounts or services. */
export const test = base.extend<{ api: ApiState; waitForPageRequests: () => Promise<void> }>({
  waitForPageRequests: async ({ page }, provide) => {
    const pending = new Set<Request>();
    let lastActivity = Date.now();
    const onRequest = (request: Request) => {
      // EventSource is long-lived and reconnects after the fixture closes its stream.
      // Only finite UI fetches and Next.js route prefetches need to settle before navigation.
      if (!["fetch", "xhr"].includes(request.resourceType())) return;
      if (new URL(request.url()).pathname === "/api/notifications/events") return;
      pending.add(request);
      lastActivity = Date.now();
    };
    const onFinished = (request: Request) => {
      if (pending.delete(request)) lastActivity = Date.now();
    };
    page.on("request", onRequest);
    page.on("requestfinished", onFinished);
    page.on("requestfailed", onFinished);
    await provide(async () => {
      await expect.poll(() => {
        if (pending.size) return [...pending].map((request) => request.url());
        return Date.now() - lastActivity >= 500 ? [] : ["Waiting for finite UI requests to settle"];
      }, { timeout: 10_000, message: "Finite UI requests must settle before hard navigation" }).toEqual([]);
    });
    page.off("request", onRequest);
    page.off("requestfinished", onFinished);
    page.off("requestfailed", onFinished);
  },
  api: [async ({ context, page, baseURL }, use) => {
    const api: ApiState = { signedIn: true, logoutCalls: 0 };
    const unexpected: string[] = [];
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await context.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const pathname = url.pathname;
      if (!pathname.startsWith("/api/")) {
        if (url.origin === new URL(baseURL!).origin) return route.continue();
        return route.abort("blockedbyclient");
      }
      const respond = (data: unknown) => route.fulfill({ json: { success: true, data } });
      if (request.method() === "OPTIONS") return route.fulfill({ status: 204 });
      if (pathname === "/api/auth/login" && request.method() === "POST") {
        api.signedIn = true;
        return respond({});
      }
      if (pathname === "/api/auth/logout" && request.method() === "POST") {
        api.signedIn = false;
        api.logoutCalls += 1;
        return respond({});
      }
      if (pathname === "/api/auth/me" || pathname === "/api/auth/verify") {
        if (!api.signedIn) return route.fulfill({ status: 401, json: { detail: "unauthorized" } });
        return route.fulfill({ json: {
          id: 1, username: "CI Preview", email: "preview@example.test", date_of_birth: "2000-01-01",
          country: "US", avatar_url: null, membership_plan: "free", membership_expires_at: null,
          stripe_subscription_id: null,
        } });
      }
      if (pathname === "/api/notifications/events") {
        return route.fulfill({ contentType: "text/event-stream", body: ": fixture\n\n" });
      }
      if (pathname === "/api/notifications") return respond({ notifications: [], unread_count: 0 });
      if (pathname === "/api/user/rewards") return respond({
        coins: 0, diamonds: 0, flowers: 0, check_in_dates: [], has_checked_in_today: false,
        current_streak: 0, daily_progress: {}, monthly_progress: 0, monthly_target: 10,
        task_claimed_today: [], monthly_claimed: false, played_game_count: 0,
      });
      if (pathname === "/api/user/cognitive-scores") return respond({
        memory: 0, logic: 0, focus: 0, reaction: 0, strategy: 0, spatial: 0,
      });
      if (pathname === "/api/user/home-system") return respond({
        items: [], owned_item_ids: [], membership_expires_at: null,
        loadout: { head: null, body: null, hand: null, background: null, limited: null },
      });
      if (pathname === "/api/leaderboard") return respond({ list: [] });
      if (pathname === "/api/games/likes") return respond({ likes: [] });
      if (/^\/api\/games\/[^/]+\/media$/.test(pathname)) return respond({ previews: [], tutorials: [] });
      if (/^\/api\/games\/[^/]+\/achievements$/.test(pathname)) return respond({
        gameKey: pathname.split("/")[3], values: { levels: 0, records: 0, noHints: 0, moves: 0 },
      });
      if (/^\/api\/games\/[^/]+\/leaderboard$/.test(pathname)) return respond({ metric: "completed_levels", entries: [] });
      if (pathname === "/api/user/learning/mental-math/bundle-access") return respond({
        bundle_unlocked: false, access_badge: "none", days_left: null, expires_at: null, diamonds: 0,
      });
      if (pathname === "/api/user/learning/progress/module") return respond({ topics: [], practice_report_topic_keys: [] });
      if (pathname === "/api/user/learning/study-time") return respond({ total_seconds: 0, total_hours: 0, last_recorded_at: null });

      unexpected.push(`${request.method()} ${pathname}`);
      return route.fulfill({ status: 501, json: { detail: "No CI fixture for this request" } });
    });

    await use(api);
    expect(unexpected, "Add an explicit fixture when the frontend API contract changes").toEqual([]);
    expect(errors, "Pages must not throw uncaught runtime or hydration errors").toEqual([]);
  }, { auto: true }],
});

export { expect };
