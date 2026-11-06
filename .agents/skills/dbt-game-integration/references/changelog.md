# Changelog

## 0.3.0 — 2026-11-06

- Made the standard workflow a single Main_Page session that implements both portal and game changes using a supplied local game path.
- Added a ready-to-copy combined integration prompt and a two-repository integration record.
- Made game-local installation optional; retained explicit-only invocation and repository-specific permission/instruction checks.

## 0.2.0 — 2026-11-06

- Moved the authoritative skill into Main_Page's `.agents/skills/dbt-game-integration/`.
- Disabled implicit invocation in Codex; use `$dbt-game-integration` explicitly.
- Updated the self-contained installer, checks, and tests for repository-local maintenance.
- Kept game-side installs explicit-only and documented installation from Main_Page.

## 0.1.0 — 2026-11-06

- Initial standalone integration package with authentication, database, API, reward, commerce, examples, and acceptance guidance.
