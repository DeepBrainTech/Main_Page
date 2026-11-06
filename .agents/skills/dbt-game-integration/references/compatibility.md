# Compatibility and source provenance

Package version: 0.3.0. Source review date: 2026-11-06.

The authoritative skill is maintained in Main_Page at `.agents/skills/dbt-game-integration/`, with explicit-only invocation configured in `agents/openai.yaml`. The standard workflow runs from Main_Page against both it and a user-supplied game repository path. Game-local installation is optional. The earlier standalone package is superseded. See [the package changelog](changelog.md).

Reviewed against Main_Page base commit `c582981cbacbf4fd19916ee0298ac86a76317b33` and the current local workspace. The workspace had existing uncommitted changes, including launch/auth files. This package describes inspected source, not a guaranteed immutable commit snapshot or confirmed production behavior.

## Shared capabilities

- Game registry and per-game JWT signing: `backend/api/config/game_auth.py`.
- Token issuance and opt-in session refresh: `routes/games.py`, `services/game_sessions.py`.
- Cookie-only portal authentication: `auth.py`; credentialed CORS: `main.py`.
- Platform asset mutation/ledger: `services/assets.py`.
- Configured first-clear rewards: `config/game_rewards.py`, `services/game_rewards.py`, `routes/game_reward_routes.py`.
- Configured paid products/grants: `config/game_commerce.py`, `services/game_purchases.py`, `routes/game_purchases.py`.
- Generic catalog/inventory: `config/shop_items.py`, `services/inventory.py`, `routes/user.py`.
- Bounded signed avatar reads: `services/game_avatars.py`, `routes/game_avatar_routes.py`.

Paths after the first entry above are relative to `backend/api/`.

## Features with explicit game support

- First-clear configuration currently contains only Freefall Chess: levels 1–105, 200 coins each. Service generality does not mean all games already have rewards.
- Paid product configuration currently contains QuantumGo AI review.
- Game-owned inventory dispatch and delivery are implemented for Freefall Chess and Knightours Chess. Other catalog items use generic portal inventory unless new code is added.
- Portal leaderboard and achievement integrations currently support Freefall Chess. Achievement events produce portal notifications; do not assume they automatically credit assets.
- QuantumGo flower transfers use their own specialized flow, outside this package's new-game baseline.
- Clicking/launching a game currently records statistics without automatically awarding flowers, despite legacy response field names.

## Bundled code

`assets/examples/portal-client.ts` and `portal_grants.py` are copied from `backend/api/integrations/` as reviewed. They are starting points, not a separately released SDK with universal feature coverage. In particular, browser client inventory types do not represent the specialized game-owned delivery responses or every bundle shape.

`assets/examples/verify-login.mjs` is a new adapter example for the current login claims. It uses `jose`, requires deployment configuration, and does not create database players, issue sessions, or perform live account introspection.

No game backend source or production environment was inspected for this package. The portal can verify a signed game assertion but cannot prove how a game produced that assertion. Complete game-side validation and deployment checks separately.

## Updating contracts

After a portal API change, compare method/path, Cookie versus Bearer authentication, claims and their types, issuer/audience, idempotency semantics, errors, and response types. Update affected references, examples, and acceptance cases together. Keep historical identifiers stable. Record compatibility changes in the changelog and pin consuming games to a reviewed revision.
