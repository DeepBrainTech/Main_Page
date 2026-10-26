# Game detail leaderboard

`GET /api/games/chessmater/leaderboard` requires an active portal session and
returns at most the top 100 players by completed levels. Players in this list
are marked `is_current_user` when appropriate; no separate personal ranking or
pagination cursor is returned. Extra query parameters cannot fetch later ranks.

The portal signs a 60-second game JWT and reads the existing Freefall Chess
`GET /leaderboard?mode=completed&includeMe=1&paged=1&startRank=1` endpoint.
The upstream personal row is discarded. This does not call the launch/token
endpoint, create a game account, record play activity, or grant rewards. The
game database remains the score source; no portal migration is required.

Configure these variables on the **portal backend**:

- `CHESSMATER_API_URL`: game backend base URL, default
  `https://chessmater-production.up.railway.app`. Use the backend URL, not the game frontend.
- `CHESSMATER_JWT_SECRET`: must match the game backend. Never expose it through a frontend variable.
- `CHESSMATER_JWT_ALG`, `CHESSMATER_JWT_AUD`, `CHESSMATER_JWT_ISS`: match existing
  game JWT settings; defaults are `HS256`, `chessmater`, and `main-portal`.

Development Docker Compose loads credentials from `backend/api/.env` and uses
`http://host.docker.internal:3001` for the local game backend. To use the online
game instead, set `CHESSMATER_API_URL` in the shell or root `.env` before running
Compose. Recreate the backend container after changing environment variables:
`docker compose -f docker-compose.dev.yml up -d --no-deps backend`.

Production Docker Compose forwards these variables from its environment or root
`.env`. Other deployments must set them directly on the portal API service.

If the game returns HTTP 401, verify the secret, algorithm, audience, and issuer
against the **deployed game backend**, not only a local game `.env`. The portal
shows a retry state instead of substituting sample scores.

The game counts distinct completed levels in `user_level_stats`, ordered by
completion count descending and portal user ID for ties. Unlocks are not
completions. The proxy preserves game ranks, returns only public display fields,
uses bounded request timeouts, and disables redirects. Responses use `no-store`
because current-user highlighting depends on the authenticated viewer.

The detail card shows approximately ten rows before scrolling internally.
It reuses the notification panel's scroll activity hook and shared scrollbar
styles: the scrollbar appears while scrolling and fades after scrolling stops.
CSS overscroll containment handles
touch input; the existing contained-wheel hook prevents wheel events from
scrolling the parent at either boundary. The list supports keyboard focus.
It shows medals for ranks 1–3, localized completed-level counts, and loading,
empty, and retry states.
Other games retain the not-yet-available message.
