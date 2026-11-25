# Local development and acceptance

## Start the game locally

- Reuse the repository's development Compose setup when available. When adding it, include the app, its test database, and any required supporting services. A host-run app with containerized dependencies is also valid when it fits the repository. Document the environment files, public URLs and ports, container service addresses, and migration, startup, log, and shutdown commands. Provide secret-free environment examples for new requirements.
- Use isolated local databases and accounts. Verify that both the browser and containers resolve their intended API addresses. Apply schema migrations to a fresh database, and test the upgrade path when changing an existing schema. Verify a database-backed operation in addition to checking the process health response. Preserve local data volumes on routine shutdown.
- Follow the portal [local development guide](../../dbt-game-integration/references/local-development.md) and [integration acceptance checklist](../../dbt-game-integration/references/acceptance.md) for the cross-repository flow. Use the guide's Freefall Chess setup as a worked example and adapt ports, origins, credentials, and service names to the target. Check the actual configured endpoints on both sides, including server-to-server calls, before using a local test account.

## Verify through normal entry points

- Run the repository's applicable build and tests for every game. In a browser, sign in through DBT, launch the game, verify the game session, refresh, then switch accounts and check data isolation. Test invalid or expired credentials and cross-account resource requests. Verify a real save or match can be recovered from the database.
- For level games, use an original prototype action sequence to complete and reload a level, check the result and unlock, and verify that a rejected or repeated completion does not change the outcome. Exercise concurrent settlement when the same result can be submitted concurrently.
- For turn-based matches, use two isolated browser sessions and distinct test accounts to play through an entire match. Exercise illegal, duplicate, stale, and concurrent actions, reconnect from a missed update, and verify the final result. For hidden information, inspect actual response and event payloads for each role in addition to checking the rendered board.
- Use a test environment for any enabled platform deliveries, rewards, purchases, or rankings. Verify persistence through a transient failure and retry where applicable, including duplicate requests or receipts.

Report actual service addresses and commands, test results, and missing prerequisites. Keep build and unit-test results distinct from live browser acceptance.
