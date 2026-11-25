---
name: dbt-game-backend
description: Convert a playable frontend game prototype into a deployment-ready DBT game with server-side rules, persistence, and local verification. Explicitly invoke when preparing a level-based or turn-based web game for deployment.
---

# DBT Game Backend

Use `$dbt-game-backend` once a playable prototype exists. From Main_Page, resolve the target game repository and read its applicable instructions before changing it. Use the existing working trees, preserve unrelated changes, and treat other game checkouts as read-only examples. If the user requests a plan, stop after the plan.

## Convert the prototype

1. Run or inspect the prototype. Identify rule inputs, state transitions, completion, scoring, modes, and any existing saves. Capture representative action sequences as regression fixtures. Preserve the gameplay and UI unless the user asks for changes. Handle supported existing data when changing a save format or schema.
2. Separate rules from rendering, animation, browser storage, and network calls. Keep deterministic state transitions testable. Share pure rules with the client where practical, and run the authoritative rules on the server. Keep hidden state, unrevealed randomness, and signing credentials on the server.
3. Preserve an existing backend stack and deployment layout. For a new full-stack web implementation, default to Next.js App Router, TypeScript, Prisma, and PostgreSQL. Keep Route Handlers thin. Use a separately running service when persistent rooms, real-time connections, or a chess engine require a different runtime. Use existing repository scripts and infrastructure where they fit.
4. Implement [level-based games](references/level-games.md), [turn-based matches](references/turn-based-matches.md), or both as required by the prototype. Add schema migrations and implement the full path from the existing UI to the authoritative API and back. Preserve ownership and retry semantics when writes overlap or fail partway.
5. Complete mandatory portal identity integration using [dbt-game-integration](../dbt-game-integration/SKILL.md). Read that Skill for the portal registration and connection work needed in this session. If registration already exists, verify and reuse it. Rewards, purchases, achievement notifications, and portal leaderboards are enabled according to the requested features.
6. Run [local development and acceptance](references/local-development.md). Check the relevant game workflow, then test through the portal with its existing integration guide. Report the changes by repository, local startup and migration commands, actual test results, and any deployment configuration still required. Treat this workflow as deployment preparation. Actual deployment is a separate user action or request.

## Required identity model

- DBT Main_Page is the sole login provider for every formal game. A player opening the game without a valid session goes through the portal login flow. Keep prototype-only identity paths out of the deployed game.
- Only the numeric `user_id` from a verified portal-issued login credential identifies a player. Store it in a non-null, unique `portal_user_id` on the game player record. An internal database key may coexist with it, and any game-local session must be bound to it. Usernames are display data.
- Authorize saves, matches, and inventory from the authenticated identity. Derive that identity on the server. Treat browser-supplied account IDs as untrusted input. Follow the integration Skill for credential types, account switching, and session lifecycle.

Keep source UTF-8 and code comments in English. Never run `git add`. Remove temporary files created during the work.

## Example invocation

> 用 `$dbt-game-backend` 把这个已能玩的前端原型改成部署版。保留现有界面和玩法，实现双人对战、服务端落子和断线恢复，接 DBT 主站登录，并用 Docker 跑完一局双账号对战。
