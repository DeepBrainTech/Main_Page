# Portal and game integration record

Use this as the per-game integration record when one agent implements both sides from Main_Page. Place it in the existing per-game documentation structure, recording both repository paths and results. It can also serve as a handoff if work is explicitly split or access is unavailable. Leave unknown decisions explicitly pending. Never place secrets in this document.

## Identity and deployment

Reference only: Freefall Chess uses `chessmater` for game key/API slug/audience, `CHESSMATER` for backend prefix, and game-owned inventory. Record the target's actual identifiers below; do not copy these defaults for a different game. See [the worked reference](../references/freefall-chess.md).

- Game display names/locales:
- Stable `game_key`:
- API `api_slug`:
- Backend environment prefix:
- Game repository and revision:
- Main_Page repository and revision:
- Game frontend production/development origins:
- Game API production/development origins:
- Portal API origin and portal login URL:
- Frontend game-URL environment variable:
- JWT algorithm, audience, issuer:
- Requested token lifetime (portal default: 300 seconds):
- `has_session`: true for the new-game baseline.
- `track_daily_play` and why:
- Secret-manager references for each backend (no values):

## Local testing configuration

Use [local development](../references/local-development.md) as the Freefall Chess baseline; record the target game's actual configuration without secrets.

- Startup mode (Docker or direct) and per-service working directories/commands:
- Portal frontend/API and game frontend/API origins and ports:
- Environment-file locations and public URL variable names:
- Portal/game database targets and initialization status (no passwords):
- CORS allowlists, Cookie names/domain/SameSite/Secure:
- Backend-to-backend URLs, including container-to-host routing:
- Health checks, browser launch/refresh/account-switch results:

## Game implementation

- Game bootstrap/authentication route and payload:
- Player table and unique portal-ID mapping:
- Existing account migration requirements:
- Game-session strategy, lifetime, and revalidation policy:
- Account-switch, portal logout, and disabled-account behavior:

## Requested optional features

- First-clear range and portal-asset reward vector, or explicit request for unsupported rules:
- Paid product IDs, target schema/ownership checks, costs, purposes, duration, and once-only versus repeated access:
- Catalog item IDs/bundles and prices:
- Inventory owner and delivery/retry/deduplication contract:
- Leaderboard/achievement adapter requirements (new-game support requires implementation):
- Other game-specific requirements:

## Work split and acceptance

- Game-side changes completed:
- Portal-side changes completed:
- Game-side work still required:
- Portal-side changes requested:
- Secret/origin/deployment changes requested:
- Automated checks executed:
- Browser/end-to-end checks executed:
- Checks pending and responsible maintainer:
- Agreed rollout order and package version/commit:
