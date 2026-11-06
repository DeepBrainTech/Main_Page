# Integrate both repositories from Main_Page

Open Main_Page in your coding agent. Copy the prompt below and replace `GAME_REPOSITORY_ABSOLUTE_PATH`. The only essential location input is the actual local game repository root. Add known deployment URLs, assigned identifiers, or explicitly requested optional features; do not include secret values.

```text
Use $dbt-game-integration from this Main_Page repository to complete both
the portal-side registration and the game-side DBT integration.

Game repository: GAME_REPOSITORY_ABSOLUTE_PATH

Inspect both repositories and their applicable AGENTS.md instructions before
editing. Infer existing game identifiers, framework, database, and configuration
from the code. Ask about missing essential decisions rather than inventing
production URLs, reward amounts, or prices. Preserve unrelated changes.

Implement both sides in this session:
- Register the game with Main_Page and add its localized launch entry.
- Implement or adapt the game's verification of portal login tokens.
- Link game players to the verified Main_Page user_id using a unique mapping;
  preserve compatible existing local player IDs and data.
- Complete launch, session refresh, expiration, account switching, and access
  checks using the existing DBT contracts. Do not create another account
  registration/password system in the game.
- Reuse existing implementations where they already satisfy the requirements.

Only integrate rewards, paid products, inventory, leaderboards, or achievements
when explicitly requested below or confirmed as an existing game requirement.
Separate unsupported extensions from features already provided by the portal.

Optional requirements: None requested beyond required existing game behavior.
Known IDs, URLs, and business rules: Infer from existing configuration; ask if
essential values are missing.

Run appropriate checks in both repositories. Write a per-game integration
record using the skill's portal-registration template, adapting the location
to the existing documentation structure. Summarize changes and test results
for each repository, configuration variables required on each backend, and
remaining deployment/live-verification steps. Do not stop at proposing a plan
or handing game-side work to another session when both repositories are
accessible and the changes are authorized.

Respect filesystem permissions for the game path and report any access block.
Do not include secrets in documents, run git add, modify production data,
create real payments, or deploy services. Remove temporary files you create.
```

Windows game-path example: `D:\DeepBrainTech\MyGame`. macOS/Linux example: `/home/developer/projects/mygame`. Replace the optional requirements line with actual agreed features when needed; do not submit illustrative prices as approved business rules.

For a later focused change, explicitly request portal-only or game-only scope. The default prompt above intentionally covers both repositories without copying the skill into the game.
