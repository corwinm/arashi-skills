---
name: arashi
display_name: Arashi Worktree Orchestration
description: Guided configured worktree coordination with Arashi, plus ad hoc use in unconfigured projects.
version: 0.2.1
repository: https://github.com/corwinm/arashi-skills
owner: corwinm
license: MIT
compatibility:
  os: [macos, linux, windows]
  required_commands: [git]
  optional_commands: [npm, node, fzf, tmux, sesh, herdr]
entry_commands:
  install_arashi: "see https://arashi.haphazard.dev for installation instructions"
  verify_arashi: arashi --version
  discover_commands: arashi --help
  workflows:
    configured: arashi init && arashi status
    intermediate: arashi clone --all && arashi create <branch> && arashi switch <branch>
    advanced: arashi pull && arashi sync
    standalone: arashi init --zero-config && arashi status
  session_shortcuts:
    list: arashi list
    switch: arashi switch
visibility: public
status: draft
---

# Arashi Skill

Coordinate Git worktrees across configured Arashi workspaces, or use Arashi ad hoc in an unconfigured non-bare Git project.

## Start

1. Assume the CLI is installed unless installation was requested or `arashi --version` fails.
2. Use installed `arashi --help` and `arashi <command> --help` as parameter authority.
3. Diagnose workspace health with `arashi doctor --json` before lower-level recovery.
4. Choose one mode, then load only the reference for the task.

## Choose a mode

- **Configured mode**: Prefer configured mode; use ordinary `arashi init` for persisted defaults, custom paths, repository groups, workspace or repository hooks, child repositories, or coordinated commands. This is also the preferred mode for a single repository that needs those features.
- **Zero-config standalone mode**: use `arashi init --zero-config` only for ad hoc work in an unconfigured non-bare Git project. It does not create or persist `.arashi` configuration. Passive discovery does not repair ignore coverage, and bootstrap must not edit tracked `.gitignore` or global Git configuration automatically.

## Universal operating rules

- Filter before broad mutation. For mutating, expensive, network-heavy, or long-running multi-repository commands, use `--group` or `--only` unless the user explicitly requested every managed repository.
- Preserve existing Git state. Preview broad removal with `arashi remove --dry-run`; do not delete worktrees, branches, or uncommitted changes without explicit scope.
- Never create or modify global Git ignore configuration for Arashi. In configured workspaces, choose repository-local, tracked, or no-write ignore policy deliberately; bare repositories report administrative paths without editing ignore files.
- Use `--json` for parsed non-interactive output. Treat `JSON_UNSUPPORTED_FOR_MODE` as a structured refusal for interactive, shell-code, or launch behavior.
- Treat launcher and hook failures as real failures. Do not synthesize terminal/session identifiers, bypass user security policy, interpolate user paths into shell source, or silently fall back to a different launcher.
- Prefer linked references over repeating command-specific rules here.

## Task routing

- **Install, update, or shell completion**: [Setup commands](references/commands/setup.md) and [Prerequisites](references/prerequisites.md)
- **Initialize, add, clone, or repair managed paths**: [Workspace commands](references/commands/workspace.md)
- **Run across repositories, parse JSON, hand off, or push**: [Automation commands](references/commands/automation.md)
- **Create coordinated worktrees or move changes**: [Create commands](references/commands/create.md)
- **Switch, launch, or select a session context**: [Switch and launch](references/commands/switch-and-launch.md) and [Session shortcuts](references/session-shortcuts.md)
- **Remove or prune**: [Remove and maintenance](references/commands/remove-and-maintenance.md) and [Hooks](references/hooks.md)
- **Choose an end-to-end goal**: [Workflows](references/workflows.md) or the [Tutorial](references/tutorial.md)
- **Diagnose a failure or operational security boundary**: [Troubleshooting](references/troubleshooting.md) and [Prerequisites](references/prerequisites.md)

## References

- [Command family index](references/commands.md)
- [Workflows](references/workflows.md)
- [Hooks](references/hooks.md)
- [Session shortcuts](references/session-shortcuts.md)
- [Tutorial](references/tutorial.md)
- [Troubleshooting](references/troubleshooting.md)
- [Cheat sheet](assets/cheatsheet.md)

Current installation and product documentation: https://arashi.haphazard.dev. Compact upstream context: https://arashi.haphazard.dev/llms.txt.
