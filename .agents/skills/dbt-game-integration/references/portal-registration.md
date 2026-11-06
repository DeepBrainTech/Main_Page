# Portal maintainer workflow

For the standard workflow, the agent starts in Main_Page and implements both repositories using [the combined prompt](../assets/integration-prompt.md). Use [the integration record](../assets/portal-registration.md) to capture requirements and outcomes; a pre-existing handoff is not required. Validate stable IDs and requested features from both repositories before changing Main_Page. Examples below use an unregistered `mygame`.

## Authentication registration

Add an entry to `backend/api/config/game_auth.py`:

```python
GameAuthEntry(
    game_key="mygame",
    api_slug="mygame",
    env_prefix="MYGAME",
    default_aud="mygame",
    has_session=True,
    track_daily_play=False,
),
```

Configure both backends with matching signing parameters using the [environment example](../assets/examples/.env.example). Every game gets a separate secret. An optional reward secret is shared only by the relevant backends. Never distribute the portal account-signing key.

The registered game joins the supported game-key catalog automatically through the registry union. Decide explicitly whether any additional catalog/status lists need adjustment. `track_daily_play` enables daily tracking; it does not define a new reward policy.

## Frontend entry

Update `frontend/main_page/config/game-launch.ts` with a token launch key/entry, `apiSlug`, and configured game URL. Add the visible entry and associated data in `frontend/main_page/config/brain-games.ts` and any needed game-detail metadata/assets. Use existing types and components rather than hardcoding an extra launch button.

Add English and Chinese interface translations in `frontend/main_page/language/en.json` and `zh.json`. This package's English documentation does not change the portal's multilingual UI requirements. New deployment-specific URLs should use a named public frontend environment variable.

Use the shared `useGameLauncher` path so authentication failures and launch semantics stay consistent. Keep internal IDs stable across display-name changes; Freefall Chess retains `chessmater`, `chessMater`, `CHESSMATER`, and legacy SKUs/routes.

## Optional features

- First-clear assets: add a `LevelRewardRule` in `config/game_rewards.py`. Confirm the event range, amount, user-ID type, secret, and stable deduplication identity. Non-range reward rules require an implementation change.
- Catalog items: add to `config/shop_items.py` with game applicability and portal-owned prices. Choose inventory ownership first. A new game's game-owned inventory requires additional delivery code; the existing dispatcher only supports the two explicit prefixes.
- Paid authorizations: add target validation in `lib/commerce_targets.py` and a `GameProduct` in `config/game_commerce.py`. Confirm target ownership is checked in the game backend.
- Avatars: the bounded server-signed avatar lookup is shared for registered games.
- Leaderboards/achievements: implement explicit adapters/configuration after agreeing the game's API; current support is Freefall Chess-specific. Do not register a game and claim these are enabled.
- Flower transfers: existing QuantumGo behavior is a specialized protocol. Scope new support separately.

These paths are relative to `backend/api/` unless a frontend path is given. Shared routes already cover token issuance, refresh, configured level rewards, and configured paid products; ordinary new registration does not need duplicate routes for those capabilities.

## Origins and deployment

Review `backend/api/main.py` CORS configuration for the actual game origins, including development ports, and portal Cookie behavior in `auth.py`. The existing regex permits HTTPS DBT subdomains; nonmatching origins need explicit configuration. Never use a credentialed wildcard origin as a shortcut.

Coordinate environment variables and deployments on both services. A local `.env` change does not update deployed services. Do not run old production migrations from historical integration documents as a routine new-game step; apply only schema changes required by the current implementation and migration state.

Run relevant backend tests in the existing isolated test setup and appropriate frontend checks. Complete [acceptance](acceptance.md), including real browser Cookie behavior. Identify what the game maintainer tested separately. Report any feature awaiting secrets, deployment, or the other service.
