# Command Reference

Choose only the command family needed for the task. The installed `arashi --help` and `arashi <command> --help` are the parameter authority.

## Command families

- [Setup, update, and completion](commands/setup.md) — install or update Arashi and configure shell completion.
- [Workspace and repositories](commands/workspace.md) — initialize workspaces, reconcile managed ignores, add or clone repositories, and recover missing clones.
- [Automation and coordinated execution](commands/automation.md) — run workflows or commands across selected repositories, parse JSON, create handoffs, use groups, and publish coordinated branches.
- [Create worktrees](commands/create.md) — create coordinated worktrees, choose a base branch, move changes, and control post-create selection or launch.
- [Switch and launch](commands/switch-and-launch.md) — select existing worktrees and choose shell, terminal, editor, tmux, sesh, cmux, Kitty, or Herdr behavior.
- [Remove and maintenance](commands/remove-and-maintenance.md) — preview removal, run cleanup hooks, and prune stale Git worktree metadata.

## Global CLI conventions

- The installed `arashi --help` and `arashi <command> --help` are the parameter authority.
- Global short aliases are `-v/--verbose`, `-f/--force`, `-j/--json`, `-o/--only`, `-g/--group`, and `-n/--dry-run`. `add -n/--name` remains command-local name syntax, and `exec --jobs` remains long-only.
- Deprecated compatibility syntax remains accepted throughout Arashi 1.x, but use canonical forms in actionable commands: `--no-cd` maps to `--launch`, `--no-default-launch` maps to `--ignore-configured-launcher`, and Markdown is the default so omit the deprecated compatibility spelling `--markdown`. Its removal is no earlier than 2.0 and requires a separately approved breaking-change issue.
- Arashi provides generated completion and shell-wrapper setup; do not claim native shell completion.

## Safe defaults

- Diagnose first with `arashi doctor --json`; use `arashi status` when human-readable state is enough.
- Prefer configured mode for persisted defaults, groups, hooks, custom paths, or coordinated repositories. Use zero-config standalone mode only for ad hoc work in an unconfigured non-bare Git project.
- Before mutating, expensive, network-heavy, or long-running multi-repository work, apply `--group` or `--only` unless the user explicitly wants every managed repository.
- Use `--json` only for non-interactive modes. Handle `JSON_UNSUPPORTED_FOR_MODE` as a structured refusal rather than scraping human output.
- Preview broad removal with `arashi remove --dry-run`; preserve existing worktrees and branches unless removal is explicitly requested.
