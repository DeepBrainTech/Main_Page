# Rewards, purchases, and inventory

## Ownership

Portal coins, diamonds, and flowers are authoritative in the portal asset service and ledger. Game-specific progress, unlocks, and selected game-owned inventory are authoritative in the game database. A browser-reported balance, success screen, or unverified inventory response is not backend proof of payment.

Separate three operations: earning portal assets for a verified achievement; spending assets for an authorization; and purchasing inventory that must be delivered. They have different credentials and deduplication rules.

## First-clear rewards

The game backend confirms a genuine completed level and persists completion plus a pending reward event in its database transaction. A worker or recoverable retry loop sends the signed first-clear request in [API contracts](api.md). Derive `user_id` and `level` from trusted server records, not client claims.

The portal determines the amount from `config/game_rewards.py`. Current support is one reward vector for an inclusive range per game:

```python
"mygame": LevelRewardRule(
    first_level=1,
    last_level=50,
    rewards={"coins": 50, "diamonds": 2},
),
```

This is a proposed registration example. Currently only `chessmater` is configured: levels 1–105, 200 coins per first clear. The generic service supports additional registered games after configuration. Different per-level amounts, repeatable wins, daily/seasonal rewards, and event budgets require new rules/contracts; the current range rule does not implement them.

The portal verifies the signed event, checks the portal account, serializes asset changes, and commits the reward and deduplication record together. Claim identity is per user/game/level. Repeated calls do not credit again. The `chessmater` ledger operation `first-clear-coins` is a historical identifier and must remain stable.

On timeout, retry the same event with a freshly signed short-lived credential. Mark delivery complete only after checking the returned game/level and response. A reward-configuration change does not re-award completed claims; duplicate responses use the saved original amount. Do not change event or ledger identities to bypass a previous claim.

The portal trusts the game's signed completion assertion; it does not replay the game to prove the win. Protect the backend completion logic and signing secret accordingly.

## Paid backend features

The portal maintainer registers a `GameProduct` in `config/game_commerce.py`, including a target validator, fixed price, purpose, and duration. The game first checks the target exists and the player can use it; portal format validation is not proof of game ownership.

The browser reads a quote, generates a request UUID once per user purchase action, and retains that request across network retries. The portal deducts assets and returns a signed grant bound to the player, game, product, purpose, target, purchase ID, issuer, audience, and expiration.

The game backend verifies all those fields against trusted session/target data. The bundled `portal_grants.py` is an upstream Python helper; pass the player's **portal ID**, not a game-local UUID. Use a fixed configured algorithm and issuer. Non-Python backends must perform equivalent checks.

For a once-only computation/action, atomically record and enforce a unique execution key such as `(portal_user_id, purchase_id)` or use it as a durable job key. JWT verification alone does not make execution single-use. For a time-bounded entitlement, repeated authorized access may instead be intended: decide this per product.

Currently QuantumGo `ai-review` costs 5 diamonds with a 24-hour grant. Its target formats are `room:<UUID>` or `local:<64 lowercase SHA256 characters>`. This is an existing product example, not the required target format for all games.

## Choose one inventory owner

### Existing shared portal inventory

The generic `/api/user/shop/redeem` deducts assets and adds items to the portal inventory. `/consume` decrements that inventory with request deduplication. Do not also maintain a separate authoritative game quantity for the same item.

The browser client can coordinate UI actions, but a browser's claim that consumption succeeded is not a cryptographic backend authorization. A feature requiring trusted backend payment proof should use a signed paid-grant or an explicitly implemented delivery flow. Portal-side deduplication does not prevent duplicate game effects by itself.

### Existing game-owned inventory deliveries

Freefall Chess (`chessmater`) and Knightours Chess (`chess-tourmaster`) have dedicated portal implementations. Portal catalog/charges remain central, while the game owns its inventory and consumption.

The existing redeem route returns `purchase_id`, `item_id`, `grants` (item ID to quantity), `grant_token`, `cost`, and `assets`. The signed receipt includes numeric `user_id`, `game_key`, `purpose` (`chessmater-inventory` or `chess-tourmaster-inventory`), `purchase_id`, `grants`, and standard login-configured issuer/audience/expiration. Receipts currently last 600 seconds.

The game validates the signature, fixed issuer/audience/algorithm, purpose, game, user, allowed item IDs, positive integer quantities, expiration, and UUID. It commits inventory additions and a unique per-user purchase receipt in one transaction. Duplicates return the original outcome without adding stock.

Portal-side recovery endpoints, authenticated by the browser's portal Cookie:

- `GET /api/user/shop/chessmater/deliveries`
- `POST /api/user/shop/chessmater/deliveries/{purchase_id}/ack`
- Equivalent paths with `chess-tourmaster` replacing `chessmater`.

Pending deliveries return newly signed receipts. Acknowledge only after the game database commit. A crash after game commit but before acknowledgment is recovered by repeating the same purchase ID; the game deduplicates and then the client can acknowledge. Portal acknowledgment itself trusts the authenticated caller and is not independent cryptographic proof that a game commit occurred. The client must follow the sequence faithfully.

The two `/migrate` endpoints convert their legacy portal inventory into durable deliveries; do not call them as a new-game onboarding step. Generic portal `/consume` rejects these game-owned item prefixes with 410.

**A new game does not receive this delivery mechanism merely by adding a catalog item.** The current dispatcher selects these two game implementations by item prefix. To use game-owned inventory in a new game, the portal maintainer must implement/register an appropriate delivery contract, pending/reissue flow, acknowledgment, and deduplication, or generalize that mechanism first. Do not copy another game's prefix to trigger its routes.

## Payment recovery

Persist pending user purchase intent before sending when reload recovery is required. Reuse its UUID and parameters after timeouts. Do not automatically refund after an ambiguous game failure: delivery may already have committed. Investigate/reconcile using the recorded purchase and delivery IDs.

Recharge uses portal checkout and verified payment callbacks. Games neither implement their own platform asset ledger nor treat redirects as confirmed credits.
