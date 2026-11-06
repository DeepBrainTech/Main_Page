# Authentication and sessions

## Portal login versus game authentication

The portal performs registration, password/social login, and account-status checks. The browser calls protected portal APIs using the portal HttpOnly Cookie with `credentials: 'include'`. Portal resource APIs do not accept a game JWT as a replacement for this Cookie.

The portal issues a separate JWT for each game. Current login claims are:

```json
{
  "sub": "display_login_name",
  "user_id": 123,
  "username": "display_login_name",
  "iss": "main-portal",
  "aud": "mygame",
  "exp": 2000000000
}
```

This is an illustrative payload, not a usable token. `user_id` is the numeric portal database identity; `sub` is currently the username. Login tokens currently do not contain a `game_key` or `purpose`. Other token types can use different user-ID types and additional claims; do not normalize all protocols into one guessed schema.

## Verification

Configure the expected algorithm, issuer, and audience on the backend. Do not choose them from unverified JWT headers/claims. Current defaults are HS256, `main-portal`, and the game's registered audience, with a 300-second lifetime. The configured audience can differ from the API slug: QuantumGo defaults to `quantum-go`.

Require a valid signature, `exp`, `iss`, `aud`, a positive integer `user_id` within the current portal integer range, and the expected login identity fields. Login validation must reject paid grants and inventory receipts. The example uses the current login shape (`sub` and `username`, with no `purpose`) to separate those credentials.

Per-game HS256 secrets are shared by the portal backend and that game's backend. This establishes trust in the game backend: a holder of that secret can sign credentials for its configured scope. Never expose it through `NEXT_PUBLIC_*`, `VITE_*`, browser bundles, logs, or client-side validation. Keep portal account-signing `SECRET_KEY` private to the portal; games do not need it.

## Launch and refresh

`POST /api/games/{api_slug}/token` uses the portal Cookie and records launch activity. The portal frontend redirects to a game URL containing `#token=...&locale=...&coins=...&diamonds=...&flowers=...`.

Fragments are read by browser JavaScript, not received directly by the game HTTP server. Remove consumed credential data before analytics or third-party scripts observe it. Do not include credentials in application logs.

`GET /api/games/{api_slug}/session` returns a new game token without launch-stat mutations. It requires `has_session=True`. Both endpoints require an active portal user. A refresh token is not issued by this flow: refresh uses the portal Cookie.

Refresh once shortly before expiration, coalesce concurrent refresh attempts, and retry transient failures with bounded backoff. A game-API 401 may be resolved by one refresh and reauthentication attempt. A portal-API 401 requires returning to portal login; avoid redirect loops. Preserve only a trusted return location.

## Game-local sessions and account state

Games may validate the short-lived JWT on every request, or exchange it for a game-local session after verification. That session must bind to `portal_user_id` and have an explicit lifetime/revalidation policy. The example verifier does not implement a session store or a revocation service.

Offline signature verification does not query current portal account status. A previously issued token may remain usable until expiry after portal logout or disablement; a longer game-local session can extend that period. Do not claim immediate propagation. If immediate invalidation is required, coordinate a new introspection/revocation integration with the portal maintainer; no general game-backend introspection endpoint is documented here.

On account switching, invalidate/rebind game sessions and clear player-specific saves, pending UI state, and caches. Do not issue a fresh local session indefinitely from an expired or replayed bootstrap token. Where stronger exchange replay protection is required, agree on a dedicated one-time exchange protocol; the current login JWT has no single-use `jti` contract.

## Cookies, origins, and development

The portal currently allows credentialed CORS for configured origins and HTTPS subdomains of `deepbraintechnology.com`. Same-site sibling subdomains still have different origins and need credentialed requests and CORS.

The portal supports `ACCESS_TOKEN_COOKIE_DOMAIN`, `ACCESS_TOKEN_COOKIE_SAMESITE`, and `ACCESS_TOKEN_COOKIE_SECURE`; production uses HTTPS. Cookie domain settings and CORS solve different problems. Cross-site deployments may encounter third-party Cookie restrictions even with `SameSite=None; Secure`.

For local development, use consistent hostnames (`localhost` versus `127.0.0.1`), register the actual frontend origins, and sign in to the matching local portal environment. Cookies are not scoped by TCP port: if local game and portal APIs share a hostname, use distinct session cookie names. Game endpoints should rely on game credentials, not decode or log the portal Cookie. Protect game-local cookie-authenticated mutations against CSRF using the game's framework facilities.
