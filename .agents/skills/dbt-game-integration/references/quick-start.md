# Quick start

## Standard team workflow

Start the agent in Main_Page, provide the game's absolute local repository path, and use [the combined integration prompt](../assets/integration-prompt.md). The agent reads instructions and code in both repositories and implements both sides from that session. No game-local skill installation or second invocation is required. A game path outside the writable workspace may require the environment's normal filesystem approval.

## Before implementation

Agree on a stable `game_key`, API path `api_slug`, and backend environment prefix. They may differ. New examples use `mygame`, `mygame`, and `MYGAME`; these are illustrative values, not a registered game.

Obtain the portal API origin and portal login URL from the maintainer. The API base passed to the browser client is an origin/base without a trailing `/api`, because client methods already include `/api/...`.

Agree on production and development frontend origins, the game API origin, and optional purchases/rewards. Real secrets must be shared through your deployment secret manager, separately from the handoff document.

## Minimal game integration

1. Inspect both repositories and register the game in Main_Page using the agreed identifiers. Record the integration requirements and outcomes with [the integration record template](../assets/portal-registration.md). A handoff to another session is needed only for explicitly split work or unavailable access; it is not the default deliverable.
2. On a portal launch, read `token` from the URL fragment. Preserve unrelated fragment state when removing token data with `history.replaceState`; do not log the launch URL or retain the token in local storage.
3. Send the token over HTTPS to a game-owned authentication endpoint. For example, `POST /auth/portal` with `{ "game_token": "..." }`. This route must be implemented in the game; DBT does not supply it.
4. Verify the token on the game backend, then atomically load/create the player by verified `user_id`. Use [the verifier example](../assets/examples/verify-login.mjs) as a Node.js starting point.
5. Either validate the short-lived portal token on each game request or exchange it for a bounded game-local session. Apply ownership checks to game resources in both designs.
6. On reload without a launch token, or before token expiration, request a fresh token using the browser client `refreshSession()`. Send it through backend verification again. If identity changes, discard the previous game's session and user-scoped cached state before continuing.
7. Render the username as display data. Read current assets through the portal API when needed; launch-fragment balances are only initial UI hints.

Copy `assets/examples/portal-client.ts` into the game's frontend services layer. It has no React dependency:

```typescript
import { PortalGameClient } from './portal-client';

const portal = new PortalGameClient(PORTAL_API_BASE_URL, 'mygame');
const refreshed = await portal.refreshSession();
// Submit refreshed.game_token to the game's own authenticated bootstrap flow.
const balances = await portal.assets();
```

If `game_key` differs from `api_slug`, pass it as the third constructor argument. `refreshSession()` requires `has_session=True` in portal registration.

Do not call `startSession()` on every reload: it records portal-side launch activity. Use the received launch token first and `/session` for refresh. A direct game visit without a launch token can use `/session` after portal registration; if counting that visit is desired, define an explicit one-time launch policy with the maintainer.

## Optional integrations

Implement only the requested features. [Commerce](commerce.md) covers first-clear rewards, purchased authorizations, and inventory. [API reference](api.md) covers common endpoints. Leaderboards and achievements need game-specific portal adapters today; merely registering a game does not enable them.

Run the [acceptance checklist](acceptance.md) in both repositories and complete the integration record. State each service's tested/deployed revision and environment, distinguishing local code completion from live acceptance.
