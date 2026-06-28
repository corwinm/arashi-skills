---
name: arashi
display_name: Arashi Worktree Orchestration
description: Guided workflows for managing multi-repository feature branches with Arashi.
version: 0.2.1
repository: https://github.com/corwinm/arashi-skills
owner: corwinm
license: MIT
compatibility:
  os: [macos, linux, windows]
  required_commands: [git]
  optional_commands: [npm, node, fzf, tmux, sesh]
entry_commands:
  install_arashi: "see https://arashi.haphazard.dev for installation instructions"
  verify_arashi: arashi --version
  discover_commands: arashi --help
  workflows:
    beginner: arashi init && arashi status
    intermediate: arashi clone --all && arashi create <branch> && arashi switch <branch>
    advanced: arashi pull && arashi sync
  session_shortcuts:
    list: arashi list
    switch: arashi switch
visibility: public
status: draft
---

# Arashi Skill

Guidance for helping users manage multi-repository feature branches and worktrees with the `arashi` CLI.

## Common Requests

Users may ask for help with:

- installing, verifying, or troubleshooting the Arashi CLI
- initializing or inspecting an Arashi workspace
- cloning repositories, creating branches, switching worktrees, pulling, syncing, or removing worktrees
- shell integration, editor launch behavior, tmux/sesh shortcuts, or remove lifecycle hooks
- agent workflows for Arashi-managed meta-repositories

## Start Here

Assume Arashi is already installed unless the user is installing it or a command is not working as expected.

1. Choose the relevant guide: [Workflows](references/workflows.md), [Commands](references/commands.md), or [Session Shortcuts](references/session-shortcuts.md)
2. For command parameters, inspect current help output when needed: `arashi <command> --help`
3. For CLI setup or command failures, use [Prerequisites](references/prerequisites.md) and [Troubleshooting](references/troubleshooting.md)

## Operating Rules

- Check the docs site for the latest install instructions: https://arashi.haphazard.dev.
- Use `arashi --help` and `arashi <command> --help` when current command parameters are needed.
- Prefer `--json` for parsed command output, and handle `JSON_UNSUPPORTED_FOR_MODE` as a structured refusal for launch, shell-code, or interactive modes.
- Prefer linked references over duplicating detailed workflow instructions here.
- Use the [Hooks](references/hooks.md) reference for remove lifecycle hook guidance.

## References

- [Prerequisites](references/prerequisites.md)
- [Commands](references/commands.md)
- [Workflows](references/workflows.md)
- [Hooks](references/hooks.md)
- [Session Shortcuts](references/session-shortcuts.md)
- [Tutorial](references/tutorial.md)
- [Troubleshooting](references/troubleshooting.md)
- [Publication Policy](references/publication.md)
- [Cheat Sheet](assets/cheatsheet.md)

## Canonical Docs

- Arashi docs: https://arashi.haphazard.dev
- Workflow guides: https://arashi.haphazard.dev/workflows/
- Hooks guide: https://arashi.haphazard.dev/workflows/hooks/
- Config guide: https://arashi.haphazard.dev/workflows/config/
- VS Code guide: https://arashi.haphazard.dev/workflows/vscode/
- tmux and sesh guide: https://arashi.haphazard.dev/workflows/tmux-and-sesh/
- Agents guide: https://arashi.haphazard.dev/workflows/agents-and-specs/
