# Integration acceptance checklist

Use an isolated test environment and accounts. Record game revision, portal revision, origins, and actual results. Do not make real payments or mutate production data solely to run this checklist.

## Identity and sessions

- A portal launch reaches the correct game, verifies the backend token, and resolves the expected portal user ID.
- A direct game reload refreshes through `/session` without counting another launch.
- Missing/expired signatures, incorrect issuer/audience, an unexpected algorithm, malformed IDs, and another game's credentials are rejected.
- Paid grants and inventory receipts cannot authenticate as login tokens.
- Changing a request-body ID or a decoded but unverified JWT payload cannot impersonate another player.
- Anonymous and disabled portal accounts are handled according to actual API errors.
- Account switching clears old player state and cannot reuse the previous player's game session.
- Portal logout/disablement behavior matches the documented token/session lifetime, without a claim of unsupported immediate revocation.
- Browser calls work with deployed CORS/Cookie policy and the chosen development hostnames.
- Launch credentials are removed from the URL and absent from application/analytics logs.

## Database and authorization

- Concurrent first-login requests create exactly one player per portal ID.
- A changed display name retains the same player, progress, and inventory.
- Another player's save, match, room, and paid target cannot be read/modified by changing an ID.
- Existing-account migration uses verified mapping evidence and exposes conflicts before writing.

## Optional rewards

- Only the game backend's validated completion creates a reward claim.
- Out-of-range levels, wrong credential purposes, and invalid user-ID types are rejected.
- Repeated/concurrent claims credit once and preserve the original amount after a configuration change.
- A timeout after portal commit can be retried without duplicate credits, and pending game reward work survives restart.

## Optional purchases and deliveries

- Prices and balances come from portal state; manipulating browser fields does not alter charges.
- Same UUID/same request replays once; same UUID/different parameters conflicts.
- Insufficient assets/inventory produces no paid game effect.
- Grants are bound to the expected player, game, product, purpose, target, expiration, and purchase ID.
- Once-only effects/jobs deduplicate execution in durable game state.
- Game-owned inventory commits stock and the receipt together; repeated deliveries add stock once.
- Crashes before game commit, after commit/before acknowledgment, and after acknowledgment follow the documented recovery path.
- Expired delivery credentials can be reissued without another charge where the selected delivery contract supports it.
- Platform recharge crediting waits for verified payment processing, not a browser redirect.

## Completion report

Report checks actually executed, local test limitations (for example SQLite does not prove PostgreSQL locking), missing deployment configuration, and cross-service cases still pending. Registration alone is not end-to-end acceptance.
