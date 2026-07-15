---
name: arashi
display_name: Arashi Worktree Orchestration
description: Guided meta-repository worktree coordination with Arashi, plus optional standalone support.
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

Guidance for coordinating feature branches and worktrees across configured meta-repositories with the `arashi` CLI, with an optional standalone path for one repository.

## Common Requests

Users may ask for help with:

- installing, verifying, or troubleshooting the Arashi CLI
- initializing, inspecting, or diagnosing Arashi workspace health
- cloning repositories, creating branches, switching worktrees, pulling, syncing, or removing worktrees
- repeated multi-repo inspection or validation with `arashi exec`
- shell integration, editor launch behavior, tmux/sesh shortcuts, or remove lifecycle hooks
- agent workflows for Arashi-managed meta-repositories

## Start Here

Assume Arashi is already installed unless the user is installing it or a command is not working as expected.

1. Choose the relevant guide: [Workflows](references/workflows.md), [Commands](references/commands.md), or [Session Shortcuts](references/session-shortcuts.md)
2. For command parameters, inspect current help output when needed: `arashi <command> --help`
3. For CLI setup or command failures, use [Prerequisites](references/prerequisites.md) and [Troubleshooting](references/troubleshooting.md)

## Operating Rules

- Check the docs site for the latest install instructions: https://arashi.haphazard.dev.
- For compact agent context, prefer the curated LLM entrypoint: https://arashi.haphazard.dev/llms.txt.
- For broad Markdown context, use the full export: https://arashi.haphazard.dev/llms-full.txt.
- Use `arashi --help` and `arashi <command> --help` when current command parameters are needed.
- Prefer `arashi doctor --json` for structured workspace health diagnostics before lower-level `status`, `prune`, or `clone` troubleshooting.
- Treat configured meta-repository coordination as Arashi's primary workflow.
- Choose configured mode and ordinary `arashi init` for child repositories, groups, local/workspace hooks, persisted defaults, custom managed paths, or coordinated commands; follow the configured guidance in [Commands](references/commands.md).
- Use zero-config standalone mode only as a convenience for one non-bare repository with no `.arashi/config.json`; follow the [Standalone Repository Workflow](references/workflows.md). Passive discovery does not repair ignore coverage, and bootstrap must not automatically edit tracked `.gitignore` or global Git configuration.
- In configured workspaces, expect `init`, `pull`, `clone`, `add`, and `create` to reconcile safe repository and worktree directory ignore rules through Git. The default scope is repository-local; preserve any existing effective tracked, local, or global rule.
- Use `arashi init --ignore-scope tracked` only for an intentional team-visible `.gitignore` rule, or `--ignore-scope none` for explicit non-mutation. Never create or modify global Git ignore configuration for Arashi.
- Prefer `--json` for parsed command output, and handle `JSON_UNSUPPORTED_FOR_MODE` as a structured refusal for launch, shell-code, or interactive modes.
- Use `arashi exec` for repeated non-interactive multi-repo inspection or validation; prefer `--group <group>` for known semantic sets and use explicit `--only` filters for one-off repository lists.
- For mutating, expensive, network-heavy, or long-running multi-repo commands, apply an explicit `--group` or `--only` filter unless the user asked for every managed repository.
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
- LLM entrypoint: https://arashi.haphazard.dev/llms.txt
- Full Markdown export: https://arashi.haphazard.dev/llms-full.txt
- Workflow guides: https://arashi.haphazard.dev/workflows/
- Hooks guide: https://arashi.haphazard.dev/workflows/hooks/
- Config guide: https://arashi.haphazard.dev/workflows/config/
- VS Code guide: https://arashi.haphazard.dev/workflows/vscode/
- tmux and sesh guide: https://arashi.haphazard.dev/workflows/tmux-and-sesh/
- Agents guide: https://arashi.haphazard.dev/workflows/agents-and-specs/
- Agents guide Markdown: https://arashi.haphazard.dev/workflows/agents-and-specs.md
- Standalone workflow: https://arashi.haphazard.dev/workflows/standalone/
