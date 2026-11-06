# Game database conventions

## Identity ownership

`Main_Page.users.id` is the canonical account identity. Store it as `portal_user_id` on a game-side player/profile record with a non-null unique constraint. Preserve an existing local player UUID if game tables already depend on it.

Use an integer type compatible with the portal ID. Current portal users use a signed integer; verification examples accept positive values through 2147483647. Do not convert an existing game's UUID into a portal ID or assume equal numeric values establish a relationship.

Illustrative PostgreSQL shape (adapt through the game's migration system):

```sql
CREATE TABLE game_players (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    portal_user_id INTEGER NOT NULL UNIQUE CHECK (portal_user_id > 0),
    username_snapshot TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE game_saves (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    player_id BIGINT NOT NULL REFERENCES game_players(id),
    slot INTEGER NOT NULL,
    state JSONB NOT NULL,
    UNIQUE (player_id, slot)
);
```

The foreign key above is internal to the game database. Do not create a foreign key to a different database's `users` table or give games portal database credentials.

## Provisioning

Verify the JWT first. In a transaction, upsert a player by `portal_user_id` using a unique constraint and the database's conflict-handling mechanism. Two first requests must converge on the same record. A SELECT followed by an unprotected INSERT is insufficient under concurrency.

Only update display snapshots from trusted identity/profile sources; a username change does not create a new player. Treat snapshots as non-authoritative and avoid copying passwords, Google identity secrets, billing information, or complete portal user rows.

Resolve the current player from the verified identity/session. Query saves, rooms, and purchases using that player and explicit ownership/participation rules. Never use a request-body `user_id` to override the authenticated player.

## Data ownership

- Portal: accounts, account status, platform assets, payment records, platform reward claims, and platform asset ledger.
- Game: matches, moves, progress, saves, scores, game-specific entitlements/inventory when that ownership model is selected, and delivery/reward retry state.
- Shared portal inventory remains an existing alternative. Do not maintain two authoritative balances for one item. See [commerce](commerce.md).

Cross-service changes are separate transactions. Use durable pending work and idempotent retries; do not assume a portal commit can atomically commit the game's database.

## Existing game accounts

Do not automatically link by matching username or email. First inventory current player IDs and their authoritative linkage evidence. Migrate only verified mappings, explicitly handling conflicting mappings and orphaned game records. Preview the mapping and retain a recovery path before applying a migration.

If a legacy column called `user_id` already stores verified portal IDs, it need not be renamed solely for this guideline. Document its meaning and preserve compatibility. If it stores game-local IDs, add an explicit mapping instead of silently reinterpreting the column.

Account deletion, retention, anonymization, and immediate cross-game disablement require a coordinated platform policy. Do not invent a portal event feed or cascade independent game data on a transient refresh failure.
