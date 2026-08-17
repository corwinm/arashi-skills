# Arashi Skill Package

This directory is the installable Arashi skill used by `skills.sh`.

## Start here

- `SKILL.md`: mode selection, universal safety rules, diagnostics, and task routing
- `references/commands.md`: compact command-family index
- `references/tutorial.md`: one configured journey with an explicit standalone route
- `references/workflows.md`: goal-oriented workflow catalog
- `references/troubleshooting.md`: symptom, diagnostic, recovery, and escalation guidance

## Load only what the task needs

Focused command references live under `references/commands/`:

- `setup.md`: installation, update, completion, and executable aliases
- `workspace.md`: init, add, clone, managed paths, ignore behavior, and SSH aliases
- `automation.md`: inspect, filter, execute, hand off, pull, push, and sync
- `create.md`: coordinated creation, base selection, launch precedence, and moving changes
- `switch-and-launch.md`: worktree selection, launchers, tabs, tmux, Kitty, Herdr, and cmux
- `remove-and-maintenance.md`: removal previews, cleanup, and pruning

Other optional references:

- `references/prerequisites.md`: conditional tools, network access, and integration checks
- `references/hooks.md`: lifecycle-hook ownership, execution, safety, and recovery
- `references/session-shortcuts.md`: fzf, tmux, and sesh navigation composition
- `assets/cheatsheet.md`: lightweight command index

Installed `aw <command> --help` is the parameter authority. When the workspace is initialized or otherwise discoverable, start diagnosis with `aw doctor --json`. Otherwise verify `aw --version`, select the intended mode, and initialize it first.
