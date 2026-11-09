# Reference integration: Freefall Chess

Freefall Chess is the primary worked example: the inspected source covers portal launch, game authentication, player mapping, refresh, platform rewards, game-owned inventory delivery, leaderboard reads, and achievements. Treat it as a source reference, not proof of production deployment or a requirement to copy every legacy detail.

## Identity and configuration

See [local development](local-development.md) for the verified local port plan, environment files, startup commands, and troubleshooting for this reference game.

- Public name: **Freefall Chess**; localize display names through i18n.
- Reviewed game directory: `D:\DeepBrainTech\ChessMater`. This is a local example, not a required directory name.
- Existing `game_key`, `api_slug`, and default login audience: `chessmater`.
- Signing prefix: `CHESSMATER`; portal login issuer: `main-portal`.
- Portal frontend launch key: `chessMater`; URL variable: `NEXT_PUBLIC_CHESSMATER_URL`.
- Game frontend variables: `VITE_API_BASE_URL` for its backend, `VITE_PORTAL_API_BASE_URL` for the portal.

Preserve existing `chessmater`, `CHESSMATER`, and `chess_mater_*` identifiers when maintaining this game. A new game needs its own keys, origins, secrets, and products; do not register it under the reference game's identity.

## Source map

Main_Page paths:

- `backend/api/config/game_auth.py`, `backend/api/services/game_sessions.py`: signing, launch, refresh.
- `frontend/main_page/config/game-launch.ts`, `frontend/main_page/hooks/useGameLauncher.ts`: launch and fragment handoff.
- `backend/api/config/game_rewards.py`, `backend/api/services/game_rewards.py`: reward rules, credits, deduplication.
- `backend/api/config/shop_items.py`, `backend/api/services/chessmater_inventory.py`, `backend/api/routes/user.py`: prices, charges, receipts, recovery, acknowledgments.
- `backend/api/services/game_leaderboards.py`, `backend/api/services/game_achievements.py`: explicit game adapters.

Freefall Chess paths relative to its checkout:

- `src/boot/authBootstrap.js`: fragment capture, verification, portal refresh, session restoration.
- `src/services/portalCommerce.js`, `src/game/engine/commerce.js`: account-scoped purchase retries and claim/ack orchestration.
- `backend/server.js`, `backend/routes/auth.js`: credential checks, local sessions, player upsert.
- `backend/inventory.js`, `backend/routes/inventory.js`: receipt verification, transactional stock and deduplication.
- `backend/routes/progress.js`, `backend/level-rewards.js`: pending completion rewards and retry.
- `backend/routes/leaderboard.js`, `backend/portal-avatars.js`, `backend/achievements.js`: scores, avatars, achievements.

Inspect the actual supplied checkout before adapting code. Access to this reference checkout is not required to integrate another game; use this documented snapshot if it is unavailable. Do not edit it unless it is explicitly the target game.

## 1. Launch and authentication

The portal uses its browser Cookie to call `POST /api/games/chessmater/token`, then redirects with `#token=...&locale=...&coins=...&diamonds=...&flowers=...`.

The game captures and clears the fragment, then exchanges the token:

```javascript
// GAME_API_BASE_URL points to the Freefall Chess backend, not the portal API.
const response = await fetch(`${GAME_API_BASE_URL}/api/auth/verify`, {
  method: 'POST',
  credentials: 'include',
  headers: { Authorization: `Bearer ${gameToken}` },
});
const result = await response.json();
if (!response.ok || !result.success) throw new Error('game_login_failed');
```

This actual game route uses a Bearer header, not a JSON `{game_token}` body. The backend verifies signature, configured algorithm/issuer/audience, expiration, and identity, then upserts `users` by `portal_user_id`. The response uses top-level `success`, `sessionExpiresIn`, and `user`, unlike the portal's `data` envelope.

`user.id` is the game's local row ID. `user.portal_user_id` and `user.user_id` identify the portal account. Never assume local `id` is the portal identity.

The backend sets HttpOnly Cookie `cm_session`, with default issuer `chessmater-backend`, audience `chessmater-session`, and lifetime 86400 seconds. These differ from the 300-second portal login JWT. `GET /api/auth/me` restores the local session; it does not query current portal account status.

## 2. Refresh and account changes

Without a launch token, bootstrap first requests the portal's `GET /api/games/chessmater/session` with Cookie credentials and submits its new token to game `/api/auth/verify`. It can fall back to game `/api/auth/me` if portal restoration is unavailable. Commerce also checks that the portal session user matches the expected game account before charging.

Preserve account-switch checks. A long-lived local session or its fallback does not imply immediate portal logout/ban propagation. Decide the target game's revalidation policy explicitly.

## 3. Database identity

The existing game uses decimal TEXT portal IDs in `users.portal_user_id` and progress tables. Its unique user index supports `INSERT ... ON CONFLICT (portal_user_id)` while preserving local `users.id`.

Startup currently attempts to create that index and logs a warning on failure. Verify the deployed constraint actually exists and resolve legacy duplicates before relying on conflict-safe provisioning; the presence of startup code alone is not proof that migration succeeded.

`user_progress` and `user_level_stats` are keyed by portal identity. Reward deduplication uses `(portal_user_id, level_index)` in `user_level_coin_rewards`; inventory delivery uses `(portal_user_id, purchase_id)` in `inventory_deliveries`.

A new game can use compatible integer storage. Do not migrate existing TEXT IDs solely to match an illustrative schema; validate and normalize at service boundaries.

## 4. First-clear rewards

Current portal configuration: levels **1–105**, **200 coins** per first clear, historical ledger operation `first-clear-coins`.

Game progress processing saves a pending reward row. `backend/level-rewards.js` signs a 60-second token with string `user_id`, integer `level`, `purpose=first-clear-reward`, `aud=chessmater-level-reward`, `iss=chessmater-game`, then calls portal `POST /api/games/chessmater/level-rewards/claim`.

The portal sets the amount and credits once. The game validates returned game/level/amount before setting `rewarded_at`. Its game-owned `POST /level-rewards/claim` retries pending rows; distinguish it from the portal endpoint.

The game currently checks the expected **200-coin** amount too. Changing this game's reward policy requires coordinating that acknowledgment logic with the portal configuration. New games need their own agreed rewards and historical-replay handling.

## 5. Hint purchase: portal charge, game stock

Current catalog snapshot (read runtime prices from the portal):

- `chess_mater_reply`: hint unlock ticket, 300 coins, game column `hint_credits`.
- `chess_mater_undo`: undo, 400 coins, column `undo_credits`.
- `chess_mater_antigravity`: AntiGravity, 600 coins, column `antigravity_credits`.

Flow:

1. Read portal `GET /api/games/shop/catalog?game_mode=chessmater` and display its quote.
2. Confirm portal/game account equality and retain one purchase UUID for the action.
3. Call portal `POST /api/user/shop/redeem?item_id=chess_mater_reply&game_mode=chessmater&request_id=<UUID>` with portal Cookie.
4. Portal commits charge and purchase, returning `data.purchase_id`, `item_id`, `grants`, `grant_token`, `cost`, and `assets`. It does not add portal-owned hint stock.
5. Submit `{ "grant_token": "..." }` to game `POST /inventory/claim`, authenticated as the game player. The backend checks signature, algorithm, audience/issuer, purpose `chessmater-inventory`, game/user, expiration, purchase UUID, allowed items, and positive quantities.
6. Game commits stock and `inventory_deliveries` together; duplicates do not add stock twice. Response fields are top-level `success`, `purchase_id`, `hintCredits`, `undoCredits`, `antigravityCredits`.
7. Only after game success, call portal `POST /api/user/shop/chessmater/deliveries/{purchase_id}/ack`, then clear the pending UI operation.

Recover with portal `GET /api/user/shop/chessmater/deliveries`, which reissues short-lived receipts; repeat game claim and portal acknowledgment with the same purchase ID. Game `GET /inventory` reports authoritative stock. Consume through game business logic: portal `/shop/consume` returns 410 for these game-owned items.

The actual game uses the richer `PortalCommerceClient` with account-scoped pending storage. The bundled generic `PortalGameClient` is a simpler starting point; its `redeemItem()` TypeScript return type does not describe this delivery. Adapt response types or use the actual game client as a reference rather than assuming `inventory_quantity` is returned.

## 6. Leaderboards and achievements

Game services own scores and achievement progress. Main_Page has explicit Freefall Chess adapters and signed achievement notifications. Reuse the architecture with new adapters/rules for another game. A notification does not automatically credit coins.

## Adaptation boundaries

- Do not copy old migrations, starter-pack quantities, the legacy password placeholder column, or compatibility identity/username fallbacks as new-game requirements. Bind identity to verified login `user_id`.
- Existing frontend bootstrap includes display fallbacks from decoded claims after verification fails. These are not authenticated; privileged actions must require verified backend/session state.
- Game session fallback/lifetime does not provide immediate portal revocation.
- No Freefall Chess product is currently registered in generic `GAME_PRODUCTS`. Its paid hint flow uses inventory receipts. Generic target-bound grants are a separate optional capability; do not invent a Freefall Chess AI-review product.
- Preserve reference identifiers when maintaining Freefall Chess; allocate separate target identifiers for a new game. A reference repository path does not authorize changes to that repository.

Reviewed on 2026-11-06 against Main_Page and local Freefall Chess source; game base commit `4ad7e59fad4bdfbedebe7d4dbbcf739d1cc8f297`, plus the local workspace. This is not a production verification or full security audit.
