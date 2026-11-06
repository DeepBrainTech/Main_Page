---
name: dbt-game-integration
description: From Main_Page, integrate both the portal and a local game repository. Invoke explicitly for registration, authentication, user ID mapping, assets, rewards, and purchases.
---

# DBT Game Integration

This skill is explicit-only in Codex (`agents/openai.yaml`). Use it when the user invokes `$dbt-game-integration`; do not load these references for routine portal/game changes merely because they touch authentication or assets.

The standard workflow starts in Main_Page with a user-supplied local game repository path. Complete the authorized integration in both repositories from this session; installing or invoking another skill in the game repository is not required. Use [the ready-to-copy prompt](assets/integration-prompt.md) to collect the game path and requested features.

## Establish repository scope

- **Both repositories (default):** locate Main_Page and resolve the supplied game path. Read applicable repository/ancestor instructions for each, inspect each working tree, and preserve unrelated changes. Read [quick start](references/quick-start.md), [authentication](references/authentication.md), [database](references/database.md), [API contracts](references/api.md), and [portal registration](references/portal-registration.md). Implement both portal registration and game integration, rather than stopping after a handoff.
- **Portal-only or game-only:** use this scope when the user explicitly requests it, or when the other repository is inaccessible. Complete accessible work and identify the exact remaining changes using [the integration record](assets/portal-registration.md). Ask for missing access/path details when necessary; do not claim completion of the other side.
- **Skill maintenance:** Main_Page's `.agents/skills/dbt-game-integration/` is the authoritative source. Keep it self-contained; game-local installation is an optional alternative, not the team's required workflow.

Work only in the named repositories and relevant files. A user-supplied game path defines intended scope but does not bypass filesystem permissions; use the environment's approval flow if required. Resolve missing essential business decisions without inventing prices or production URLs, and complete independent work while answers are pending.

## Integration invariants

- The portal authenticates accounts. Games verify portal-issued credentials and authorize access to their own resources; do not create another password or social-login identity system.
- A verified login token's numeric `user_id` identifies `Main_Page.users.id`. Its `sub` currently contains a username. Never map accounts by username, email, an unverified token, or a browser-supplied user ID.
- Keep a non-null unique `portal_user_id` mapping in the game database. A game-local UUID may coexist with it. No direct portal database access or cross-database foreign key is needed.
- Portal HttpOnly Cookie authentication, game login JWTs, paid grants, and game-server event credentials are different protocols. Read [API contracts](references/api.md) before choosing credentials.
- Keep secrets on backends. Use a dedicated signing configuration per game. Preserve existing identifiers, including `chessmater`, regardless of public branding.
- Portal assets and their ledger are authoritative. Game state is authoritative for gameplay qualification. Read [commerce](references/commerce.md) only when rewards, purchases, or inventory are requested.
- Registration does not automatically implement a new game's achievements, leaderboard adapter, or game-owned inventory delivery. Consult [compatibility](references/compatibility.md); label proposed extensions explicitly.

## Implementation and verification

1. Confirm the portal and game repository roots. Identify the stable `game_key`, `api_slug`, environment prefix, domains, backend stack, and requested optional features from code and user input. Registration means registering the game with DBT, not adding a second user-registration system.
2. Implement the requested scope using the references and [example assets](assets/). Adapt examples to the game's architecture; `/auth/portal` in examples is a suggested game-owned route, not a shared DBT endpoint.
3. Use a verified identity to provision or load the game player atomically. Define expiration, refresh, account-switch, and local-session behavior. Do not claim immediate portal logout/ban propagation from offline JWT validation.
4. For financial or inventory actions, use stable request IDs and durable game-side deduplication/retry state. Never apply gameplay effects based on a browser-reported balance or successful redirect.
5. Run applicable checks in both repositories from [acceptance](references/acceptance.md). Verify matching paths, identity types, signing configuration, origins, and requested optional contracts. Distinguish code checks from live integration; report missing secrets/configuration or unavailable services.
6. Deliver a per-repository change summary, a completed integration record, checks executed, and remaining deployment steps. Do not leave authorized game changes as a handoff merely because the session started in Main_Page. Do not change production data, generate live purchases, or deploy services merely because this skill was invoked.

Never run `git add`. Keep generated source UTF-8, code comments English, and remove temporary files created during the work.
