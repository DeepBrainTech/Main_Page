# DBT integration skill: setup and ready-to-use prompts

## Standard workflow: one session in Main_Page

Every game developer has Main_Page. Open it in the agent, supply the game's absolute local repository path, and let the same session complete both portal registration and game-side integration. No game-local skill installation or second invocation is required.

Copy the [complete integration prompt](../.agents/skills/dbt-game-integration/assets/integration-prompt.md), replace `GAME_REPOSITORY_ABSOLUTE_PATH`, and add agreed optional features. A game path outside the writable workspace may require the environment's filesystem approval; providing a path does not bypass permissions.

## Main_Page: already installed

The canonical skill is checked into `.agents/skills/dbt-game-integration/`. Pull the approved Main_Page revision. No separate repository or global installation is required. Open Main_Page in Codex, and start a new session/restart if the skill is not discovered.

This skill is **explicit-only** in Codex. Invoke it with its `$` name when you need integration work:

```text
Use $dbt-game-integration from Main_Page to complete both portal registration
and game-side DBT integration in this session.

Game repository: D:\Projects\mygame

Read both repositories' instructions and existing code. Implement the localized
portal launch entry, game token verification, unique portal user ID mapping,
session refresh, account switching, and resource authorization. Reuse compatible
existing implementations. Do not create separate game accounts/passwords.

Only include optional commerce/reward features if explicitly requested or
confirmed as existing game requirements. Ask for missing essential business
decisions; do not invent prices or production URLs. Preserve unrelated changes.

Run appropriate checks in both repositories. Write a per-game integration record
and report changes, actual test results, required configuration, and deployment
or live checks still pending. Complete accessible authorized changes on both
sides rather than stopping at a plan or handing game work to another session.
Respect filesystem permissions. Do not run git add, deploy services, modify
production data, or expose secrets. Remove temporary files you create.
```

Replace the example game path. Infer identifiers, frontend/backend structure, database, and existing settings from both repositories; provide agreed values that are not already available. Optional reward amounts, prices, and inventory ownership require actual business decisions. Missing deployment secrets can remain documented while code and isolated checks proceed. Everyday code changes do not require this invocation.

## Optional alternative: install for a game-only session

Skip this section for the standard workflow above. Installation is useful only when you choose to open the game repository independently and want local skill discovery there.

Requirements: access to Main_Page, Node.js 22 or later for the installer, and an existing game working directory. No live secrets are required just to install the skill.

From the Main_Page root, run:

Windows PowerShell:

```powershell
node .agents/skills/dbt-game-integration/scripts/install.mjs "D:\Projects\mygame"
```

macOS/Linux:

```sh
node .agents/skills/dbt-game-integration/scripts/install.mjs "$HOME/projects/mygame"
```

The installer copies the complete skill into `mygame/.agents/skills/dbt-game-integration/`, including the explicit-only policy, references, examples, and supporting tools. It records the package version and source commit when available in `installation.json`. Treat that commit as provenance, not proof that the source working tree had no local changes; use an approved, clean revision for team distribution.

The installer refuses to overwrite an existing installation. It does not modify game application code, install dependencies, stage files, configure secrets, or deploy services.

For manual installation, copy the **entire** `.agents/skills/dbt-game-integration/` directory from Main_Page to the same relative location in the game repository. Exclude any local `node_modules`, preserve `agents/openai.yaml`, and include dotfiles such as `assets/examples/.env.example`. If the game's `.gitignore` ignores `.env*`, explicitly allow this secret-free example when keeping the skill in version control. The game repository does not automatically discover a skill that exists only in its sibling Main_Page checkout.

## Optional alternative: invoke in a game-only session

Open the game repository in Codex and refresh the session if necessary:

```text
Use $dbt-game-integration to integrate this game's frontend, backend, and
database with DBT. Implement portal login verification and a unique portal
user ID mapping. Produce the portal registration handoff and identify any
required portal-side changes. Do not add optional purchases or rewards unless
they are requested or already required by the game.
```

Supply the assigned game key/API slug, actual service origins, and requested optional features. Configure secrets on backends through the agreed deployment channel, not in prompts or handoff documents.

For the standard team workflow, stay in Main_Page and use the combined prompt; it does not need this game-only session. When intentionally working in separate sessions, use the relevant scope and identify any inaccessible repository work explicitly. Installation itself does not perform the integration.

## Examples and verification

- `assets/examples/portal-client.ts`: framework-independent browser client. API base must not append `/api`; methods already include that prefix. Adapt specialized inventory response types as documented.
- `assets/examples/verify-login.mjs`: Node.js login verification example. Add `jose` to the game backend's managed dependencies. This example has been exercised with jose 5.9.6 and currently supports HS256.
- `assets/examples/portal_grants.py`: Python paid-grant verifier. Manage `python-jose[cryptography]` in the game's backend environment; it was not executed in the creation environment because Python was unavailable.
- `assets/examples/.env.example`: empty backend signing placeholders. Never expose secrets through frontend environment variables.

These files are inside the installed skill directory. Installation does not add runtime dependencies or implement the game's bootstrap route/session/database layer by itself.

Use the [acceptance checklist](../.agents/skills/dbt-game-integration/references/acceptance.md) and the [integration record](../.agents/skills/dbt-game-integration/assets/portal-registration.md). In the standard workflow, report completed work and checks for both repositories; the record is not a reason to leave accessible game-side work unfinished. A handoff is a fallback for explicitly split work or unavailable access. Keep any optional installed version with the game using the team's normal review process.

## Updates

Read the skill's [changelog](../.agents/skills/dbt-game-integration/references/changelog.md) and select a reviewed Main_Page revision. Compare the existing game-side copy, move/back it up outside discoverable skill directories, then reinstall and review the diff. Do not keep two discoverable copies with the same name. Repeat checks affected by the contract changes.

The old standalone repository can remain as an archive, but should not supply new installations or become a second maintenance source.

## Discovery and token usage

The supplied `agents/openai.yaml` contains:

```yaml
policy:
  allow_implicit_invocation: false
```

According to [official Codex documentation](https://learn.chatgpt.com/docs/build-skills), this disables implicit invocation while retaining explicit `$skill` invocation. The full workflow and references are not meant to be loaded for routine work. Client discovery/metadata behavior can differ, so do not promise exactly zero token cost or assume another AI host honors this Codex policy.

If the skill is not visible, check its installed path and start a new session/restart Codex. If ordinary work unexpectedly activates a copy, check for another global/project copy with automatic invocation enabled. Existing conversation context is not removed by changing this file.
