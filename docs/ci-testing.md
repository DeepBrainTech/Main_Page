# CI testing

The `CI` workflow runs on pull requests, pushes to `main`, `master`, or `develop`,
manual dispatch, and daily at 08:00 UTC. New runs cancel older runs for the same
event and branch or PR. It runs tests only; it does not deploy or need production secrets.

## Required checks

- **Frontend checks and build**: ESLint, TypeScript, existing navigation and
  achievement tests, English/Chinese key and ICU argument checks, and a production build.
- **Backend business tests**: existing `unittest` suites with isolated SQLite fixtures
  and mocked payment, storage, and game APIs. Test dependencies include `httpx` for TestClient.
- **Browser navigation smoke tests**: Playwright against the production standalone
  app built by the frontend job. PRs use desktop and mobile Chromium; nightly runs also
  use Firefox and WebKit. Failures retain screenshots, video, and traces in the
  `browser-test-results` artifact for seven days.

Configure these three job names as required status checks in GitHub branch rules
after the first workflow run. Branch rules are not changed by adding the workflow file.

## Run locally

Use Node 22 (matching the frontend Docker image) and Python 3.11.

```sh
cd frontend/main_page
npm ci --legacy-peer-deps
npm run lint
npm run typecheck
npm run test:unit
```

`npm run typecheck` first runs `next typegen` to generate `next-env.d.ts`
and route declarations before running TypeScript. These generated files are
not checked in, so a clean checkout needs this step to resolve static image
imports without first running a development server or production build.

Browser fixtures intercept API requests, block external browser requests, and fail
on unexpected API endpoints or uncaught page errors. They verify frontend behavior,
not the correctness of the mocked backend. Build with local API addresses so no
production endpoint is embedded in the standalone app:

```sh
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000 NEXT_PUBLIC_API_URL=http://127.0.0.1:8000 NEXT_PUBLIC_GOOGLE_CLIENT_ID= npm run build
npm run test:e2e:prepare
npx playwright install --with-deps chromium
npm run test:e2e
```

Those environment assignments use POSIX shell syntax. In PowerShell, set the same
variables with `$env:NAME = 'value'` before building. If an installed Chromium browser
is preferred locally, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its executable.
To inspect failures locally, run `npx playwright show-report` or
`npx playwright show-trace <trace.zip>`.

```sh
cd backend/api
python -m venv .venv
# Activate .venv for your shell before installing dependencies.
python -m pip install -r requirements-test.txt
PYTHON_DOTENV_DISABLED=1 PYTHONDONTWRITEBYTECODE=1 DATABASE_URL=sqlite:///ci-bootstrap-unused.db python -m unittest discover -s tests -p 'test_*.py' -v
```

## Scope and follow-up work

Learning and Cognitive Test currently have smoke coverage for stable entry points.
The suite intentionally does not freeze unfinished lesson routing, per-question
interactions, report layouts, or full-page visual snapshots.

The initial backend suites use SQLite. Real frontend/API integration, PostgreSQL
transactions and concurrency, Redis, database migrations, Stripe test-mode flows,
and deployment-specific Cloudflare/Docker builds remain separate follow-up work.

Legacy unused-variable, explicit-any, hook-dependency, unescaped-text, and prefer-const
lint findings remain warnings. Syntax, hook-order, unreachable-code and applicable
Next.js errors block CI. CommonJS is allowed in JavaScript config and test scripts.
