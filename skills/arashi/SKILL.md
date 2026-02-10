---
name: arashi
display_name: Arashi Worktree Orchestration
description: Guided workflows for managing multi-repository feature branches with Arashi.
version: 0.1.0
repository: https://github.com/corwinm/arashi-skills
owner: corwinm
license: MIT
compatibility:
  os: [macos, linux, windows]
  required_commands: [git]
  optional_commands: [npm, curl, fzf, sesh]
entry_commands:
  install_arashi: npm install -g arashi
  verify_arashi: arashi --version
  workflows:
    beginner: arashi init && arashi status
    intermediate: arashi add <repo-url> && arashi create <branch>
    advanced: arashi pull && arashi sync
  session_shortcuts:
    jump: cd "$(arashi list | fzf)"
    sesh: sesh connect "$(arashi list | fzf)"
visibility: public
status: draft
---

# Arashi Skill

This skill helps you install and use the `arashi` CLI to manage multi-repository workflows and is best paired with a spec-driven development framework to provide shared context for AI-assisted engineering.

## When to Use This Skill

Use this skill when the user wants to:

- set up Arashi quickly with a documented, repeatable install flow
- choose a workflow by difficulty (beginner, intermediate, advanced)
- validate readiness before running commands across multiple repositories
- speed up daily navigation with `fzf`, `tmux`, and `sesh`
- recover from setup, network, or command failures without guesswork

## Core Commands

```bash
# install Arashi CLI
npm install -g arashi

# verify Arashi is available
arashi --version
```

## Usage Rules

When guiding a user, always:

1. Run preflight checks before installing Arashi CLI.
2. Confirm `arashi --version` before running workflows.
3. Confirm expected outcomes after each workflow step.
4. Route failures through the troubleshooting matrix before retrying.

## Workflow Catalog

- Beginner: initialize workspace and inspect status.
- Intermediate: add repositories and create a feature branch.
- Advanced: pull and sync repositories safely.
- Session shortcuts: jump or connect with `fzf` + `sesh` in tmux-based flows.

### Expected Workflow Outcomes

- **Beginner**: workspace initialized and status visible.
- **Intermediate**: repositories added and feature branch worktrees created.
- **Advanced**: repositories synchronized with clear status after reconciliation.

## References

- [Prerequisites](references/prerequisites.md)
- [Commands](references/commands.md)
- [Workflows](references/workflows.md)
- [Session Shortcuts](references/session-shortcuts.md)
- [Tutorial](references/tutorial.md)
- [Troubleshooting](references/troubleshooting.md)
- [Publication Policy](references/publication.md)
- [Cheat Sheet](assets/cheatsheet.md)
