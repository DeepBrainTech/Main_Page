# Portal API contracts

All paths are relative to the configured portal API base. Successful responses use `{ "success": true, "message": "ok", "data": ... }`. The bundled browser client unwraps `data`. HTTP errors generally expose a string `detail`; validation errors can expose an array. Do not show raw backend messages as localized game UI text.

The primary worked example is [Freefall Chess](freefall-chess.md), whose internal slug is `chessmater`. Substitute a new game's assigned slug where appropriate; do not duplicate its registration. Game endpoints in the reference use the **game** API base and often a top-level success response, not this portal envelope.

## Browser calls using the portal Cookie

Use `credentials: 'include'`. A game JWT in `Authorization` does not authenticate these routes. A server-side fetch does not automatically have the user's browser Cookie.

### Launch

`POST /api/games/{api_slug}/token`, no body. Optional header: `X-User-Timezone` containing an IANA time zone.

Returns `data.game_token`, `expires_in`, `user: {id, username}`, `assets: {coins, diamonds, flowers}`, and legacy reward/stat fields. This records launch activity. Current launch statistics do not award flowers merely for clicking a game.

### Refresh

`GET /api/games/{api_slug}/session`, no body. Requires game registration with `has_session=True`.

Returns `data.game_token`, `expires_in`, `user_id`, `username`, and `user: {id, username}`. Does not record launches. Responses disable caching.

### Assets and inventory

Freefall Chess's concrete purchase is `POST /api/user/shop/redeem?item_id=chess_mater_reply&game_mode=chessmater&request_id=<UUID>`. The portal charges its catalog price and returns a signed delivery in `data` (`purchase_id`, `item_id`, `grants`, `grant_token`, `cost`, `assets`). Submit `grant_token` to the **game** `/inventory/claim`, then acknowledge the portal `/api/user/shop/chessmater/deliveries/{purchase_id}/ack` after game success. Pending portal deliveries can reissue receipts. See the reference for the complete retry flow.

Freefall Chess inventory lives in the game: read game `GET /inventory`. The portal's generic `/shop/consume` returns 410 for these game-owned items. The following generic inventory routes describe the separate portal-owned model, not the Freefall Chess hint contract:

- `GET /api/user/assets`: `data` contains `coins`, `diamonds`, `flowers`.
- `GET /api/user/shop/inventory`: `data.items` is an array of `{item_id, quantity}` for portal-owned inventory only.
- `POST /api/user/shop/redeem?item_id=<portal_owned_item_id>&game_mode=<game_key>&request_id=<UUID>`: no body. Portal sets cost from catalog. Generic inventory returns item metadata, `cost`, `assets`, `granted_items`, and `inventory_quantity` (nullable for bundles).
- `POST /api/user/shop/consume?item_id=<portal_owned_item_id>&game_mode=<game_key>&count=1&request_id=<UUID>`: no body. Generic response includes `item_id`, `consumed_count`, `inventory_quantity`, and `game_mode`. `count` is 1–99.

Always supply a UUID for a state-changing operation. Retry with the same UUID and parameters. The two existing game-owned inventory implementations return delivery payloads instead of generic inventory payloads; see [commerce](commerce.md). The bundled `redeemItem()` return type only describes the original generic inventory shape and must be adapted before using those delivery paths or nullable bundle quantities.

### Paid authorization

This is an optional capability beyond the primary Freefall Chess inventory-delivery example. Freefall Chess has no registered generic paid product today; the existing configured product is QuantumGo AI review. Do not substitute `chessmater` into a purchase URL and assume that product exists.

`GET /api/games/{api_slug}/purchases/{product_id}/quote` returns the configured product, cost, duration, current user, and assets. The route also supports optional `target`; the bundled `quote()` helper currently omits that parameter.

`POST /api/games/{api_slug}/purchases/{product_id}/redeem` accepts JSON:

```json
{ "request_id": "43ff4455-648f-4ec9-ac37-8cd39a52f5d3", "target": "game-defined-target" }
```

Returns `grant_token`, `purchase_id`, `expires_at` (UTC Unix seconds), numeric `user_id`, `game_key`, `product_id`, `cost`, and `assets`. Product registration defines the accepted target format, price, purpose, and duration. New-game products do not exist until explicitly registered.

The game backend verifies the grant, authenticated portal user ID, and target authorization before executing a paid action. `X-Grant-Token` is the existing game-facing convention, not a credential for protected portal resource APIs.

### Checkout

`POST /api/billing/coin-checkout-session` or `/api/billing/diamond-checkout-session`, JSON `{ "bundle_id": "coins100", "locale": "en" }` (use a diamond bundle for the diamond endpoint). Response `data.url` is the checkout destination. The browser client exposes `checkout(asset, bundleId, locale)`.

Available documented bundles: `coins100`, `coins250`, `coins800`, `coins1500`, `coins2500`; `diamonds10`, `diamonds25`, `diamonds70`, `diamonds200`, `diamonds300`. Confirm the deployed catalog with the maintainer. Portal-verified payment callbacks determine crediting; a success redirect does not prove payment.

## Public catalog

`GET /api/games/shop/catalog?game_mode=chessmater` needs no authentication. `data.items` is an object keyed by item ID; each value includes `name`, `games`, and `cost`, with optional bundle `grants`.

`GET /api/games/shop/item?item_id=chess_mater_reply&game_mode=chessmater` returns the hint unlock ticket metadata. Do not hardcode catalog prices into purchase requests.

## Game-server calls using scoped credentials

The game backend signs short-lived event credentials and sends `Authorization: Bearer <token>`. These routes do not use a browser's self-reported eligibility. Secrets and signing stay server-side.

### First-clear reward

`POST /api/games/{api_slug}/level-rewards/claim`, no body.

Sign with `{PREFIX}_REWARD_SECRET`, falling back to `{PREFIX}_JWT_SECRET`; algorithm is `{PREFIX}_JWT_ALG` (default HS256). Claims:

```json
{
  "user_id": "123",
  "level": 3,
  "purpose": "first-clear-reward",
  "aud": "chessmater-level-reward",
  "iss": "chessmater-game",
  "exp": 2000000000
}
```

Use a real expiration approximately 60 seconds in the future. Here `user_id` must be a decimal **string**, unlike login tokens. `level` must be an integer in the configured range. `aud` and `iss` derive from `game_key`, not necessarily `api_slug`, and are independent of the login AUD/ISS settings.

Response `data` contains `game_key`, `level`, `rewards`, `already_claimed`, and current `assets`. A duplicate claim returns the saved original reward without crediting again. See [commerce](commerce.md) for durable retries.

### Leaderboard avatars

`POST /api/games/{api_slug}/leaderboard/avatars`, no body.

Sign with `{PREFIX}_JWT_SECRET` and `{PREFIX}_JWT_ALG`. Claims: `user_ids` (1–3 positive decimal ID strings), `purpose: 'leaderboard-avatars'`, `aud: '{game_key}-leaderboard-avatars'`, `iss: '{game_key}-game'`, `exp` (suggested 60 seconds).

The game server determines the requested users from authorized leaderboard results. `data.avatars` contains only `user_id`, `avatar_url`, `avatar_fallback_url` for available accounts. This shared lookup is not a generic leaderboard adapter.

## Existing game-specific features

Portal leaderboard and achievement reads, achievement-event ingestion, QuantumGo flower transfers, and game-owned inventory delivery have additional game-specific contracts. They are not automatically available to a new game. Read [compatibility](compatibility.md) and arrange an explicit extension instead of guessing those schemas.

## Errors and retry rules

- `401`: identify which service rejected which credential. Portal Cookie failures require portal login; a game token expiration may use one refresh/reverify attempt. Service-event failures require checking signing configuration/claims.
- `400 insufficient_assets` or `insufficient_inventory`: refresh state and show the relevant action to the user. Do not apply the game effect.
- `400 AUTH_USER_DISABLED`: the current portal active-user dependency can return this status. Clear/restrict the game session according to policy; do not treat every account-status failure as a 401.
- `404 unknown_game`, `level_rewards_not_configured`, or `unknown_game_product`: complete the corresponding portal registration. An inactive/missing reward account can return `unknown_reward_account`.
- `409`: request-ID reuse with different parameters, an expired purchase, or another operation conflict. Inspect the actual code (for example `purchase_request_mismatch` or `purchase_session_expired`); do not blindly retry with a new UUID.
- `410`: existing game-owned inventory cannot be consumed through the generic portal consume route.
- `422`: inspect parameter validation and target format.
- `503 game_signing_not_configured` or `reward_signing_not_configured`: backend configuration is unavailable; do not fallback to unsigned behavior.
- Timeouts/5xx: preserve the original operation identity and retry with bounded backoff. Refresh expired service-event signatures for the same business event. Never assume a lost response means no commit occurred.

Mutating retries can return a saved historical inventory/balance snapshot. Read assets/inventory again when current state is needed. Avoid logging credentials in failed-request diagnostics.
