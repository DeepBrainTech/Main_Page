# DBT game integration

Main_Page maintains the canonical DBT integration skill at [`.agents/skills/dbt-game-integration/`](../.agents/skills/dbt-game-integration/). Portal contracts and the skill can be reviewed together in the same repository. The earlier standalone `dbt-game-integration` repository is no longer the maintenance source.

## Use only when integrating

In Codex, explicitly invoke `$dbt-game-integration` for game integration or portal registration. Its `agents/openai.yaml` sets `policy.allow_implicit_invocation: false`, so matching words in an ordinary task do not implicitly activate it. Do not add its full instructions or an unconditional requirement to read it to the root `AGENTS.md`.

The full skill and supporting references are intended to be read only for the requested integration work. This policy controls Codex invocation; other AI hosts may handle skill discovery differently. It is not a guarantee of zero metadata/token overhead across all clients, nor does it prevent an explicit request or a relevant file search from opening a file.

Official behavior: [Build skills — invocation policy](https://learn.chatgpt.com/docs/build-skills).

## Standard team workflow

Open Main_Page in the agent, supply the absolute path to the local game repository, and use [the ready-to-copy integration prompt](../.agents/skills/dbt-game-integration/assets/integration-prompt.md). The same session reads instructions and code in both repositories, completes portal registration and game integration, and verifies both sides. The game does not need a separate skill installation or second session.

The agent must respect the game's own instructions and existing changes, and use the environment's approval flow if that path is outside its writable workspace. Registration means registering the game with DBT, not creating separate player accounts/passwords.

Record changes, checks, and remaining deployment requirements per repository using [the integration record](../.agents/skills/dbt-game-integration/assets/portal-registration.md). Portal-only/game-only work remains available when explicitly requested or when access to the other repository is unavailable. Independent game-local installation is an optional alternative.

## Read as needed

- [Primary worked example: Freefall Chess](../.agents/skills/dbt-game-integration/references/freefall-chess.md)
- [Installation and explicit invocation](dbt-game-integration-install.md)
- [Skill entrypoint](../.agents/skills/dbt-game-integration/SKILL.md)
- [Ready-to-copy prompt](../.agents/skills/dbt-game-integration/assets/integration-prompt.md)
- [Quick start](../.agents/skills/dbt-game-integration/references/quick-start.md)
- [Authentication](../.agents/skills/dbt-game-integration/references/authentication.md)
- [Database conventions](../.agents/skills/dbt-game-integration/references/database.md)
- [API contracts](../.agents/skills/dbt-game-integration/references/api.md)
- [Rewards, purchases, and inventory](../.agents/skills/dbt-game-integration/references/commerce.md)
- [Portal registration](../.agents/skills/dbt-game-integration/references/portal-registration.md)
- [Integration record / optional handoff template](../.agents/skills/dbt-game-integration/assets/portal-registration.md)
- [Acceptance checklist](../.agents/skills/dbt-game-integration/references/acceptance.md)
- [Compatibility and provenance](../.agents/skills/dbt-game-integration/references/compatibility.md)

## Maintenance

Update relevant contracts and examples when the portal changes. Version 0.4.0 uses Freefall Chess as the source-verified primary reference while keeping combined work from Main_Page. Examples retain its `chessmater` compatibility identifiers; another game requires its own identifiers and rules. Existing optional installed copies must be updated deliberately; changing Main_Page does not rewrite game repositories.

Run from Main_Page:

```sh
node .agents/skills/dbt-game-integration/scripts/validate.mjs
```

For installer/authentication behavior tests, install development dependencies in the skill directory using its package manager, then run `npm test` there. Do not commit `node_modules`. Python example execution and real cross-service acceptance require their respective environments.
