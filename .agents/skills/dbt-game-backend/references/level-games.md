# Level-based games

## Implement the prototype flow

- Resolve mode, level, rules, and unlock conditions from the server's catalog and saved progress. On start, persist an attempt owned by the authenticated player with its mode and level. If rules or level definitions can change during play, capture the information required to settle the attempt with the rules it started under.
- Accept the attempt ID and the actions needed to verify completion. For deterministic games, replay those actions on the server. If replay cannot represent the prototype faithfully, use server-maintained state or a verifier appropriate to the rules. Compute the result, move count, score, stars, and timing needed for the feature on the server. Define pause and resume behavior when time affects ranking or scoring.
- In one transaction, settle the attempt, make progress monotonic within its mode, and update any selected best records. Enforce uniqueness for per-player, mode, and level records where applicable. Handle repeated and concurrent completion without duplicating unlocks, attempts, or rewards. Define comparison and tie rules if the game exposes records or a leaderboard.
- If a verified result earns a portal reward or achievement notification, persist the delivery record with the result. Use a stable event identifier and retry delivery after commit. Use the portal integration's commerce and API references for the actual contracts available to the target game.

## Source examples

These paths are relative to their named local game repositories. Read examples if the checkouts are available and use the target repository as the authority for its rules and design.

- **Chess-Tourmaster** uses Next.js and Prisma. `chess-tourmaster/lib/game/attempts.ts` owns attempt validation and verified completion. `chess-tourmaster/lib/game/replay.ts` replays moves. `chess-tourmaster/prisma/schema.prisma` and `chess-tourmaster/tests/game-attempts.test.cjs` show persisted attempts and regression coverage.
- **ChessMater (Freefall Chess)** uses Express and PostgreSQL. `backend/routes/progress.js` illustrates monotonic progress and updates to best records. `backend/level-rewards.js` illustrates deferred first-clear delivery. Its progress endpoint also supports legacy client submissions, so use TourMaster's verified completion model when a new game's results affect ranking or rewards.
