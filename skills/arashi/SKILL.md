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
  optional_commands: [npm, curl]
entry_commands:
  install_arashi: npm install -g arashi
  verify_arashi: arashi --version
  verify_skill: bash skills/arashi/scripts/validate.sh --check all
  workflows:
    beginner: arashi init && arashi status
    intermediate: arashi add <repo-url> && arashi create <branch>
    advanced: arashi pull && arashi sync
visibility: public
status: draft
---

# Arashi Skill

This skill is already installed. Use it to install Arashi CLI, validate readiness, and run common multi-repository workflows.

## When to Use This Skill

Use this skill when the user wants to:

- set up Arashi quickly with a documented, repeatable install flow
- choose a workflow by difficulty (beginner, intermediate, advanced)
- validate readiness before running commands across multiple repositories
- recover from setup, network, or command failures without guesswork

## Core Commands

```bash
# install Arashi CLI
npm install -g arashi

# verify Arashi is available
arashi --version

# full validation
bash skills/arashi/scripts/validate.sh --check all

# workflow-only validation
bash skills/arashi/scripts/validate.sh --check workflows
```

## Usage Rules

When guiding a user, always:

1. Run preflight checks before installing Arashi CLI.
2. Use canonical Arashi install and validation commands from this skill.
3. Confirm expected outcomes after each workflow step.
4. Route failures through the troubleshooting matrix before retrying.

## Validation Gates

- Preflight gate: checks required setup commands.
- Install gate: checks `arashi` and required skill files are present.
- Workflow gate: checks required workflow references.

## Workflow Catalog

- Beginner: initialize workspace and inspect status.
- Intermediate: add repositories and create a feature branch.
- Advanced: pull and sync repositories safely.
- Session shortcuts: jump or connect with `fzf` + `sesh`.

### Expected Workflow Outcomes

- **Beginner**: workspace initialized and status visible.
- **Intermediate**: repositories added and feature branch worktrees created.
- **Advanced**: repositories synchronized with clear status after reconciliation.

## References

- Prerequisites: `references/prerequisites.md`
- Commands: `references/commands.md`
- Workflows: `references/workflows.md`
- Session shortcuts: `references/session-shortcuts.md`
- Tutorial: `references/tutorial.md`
- Troubleshooting: `references/troubleshooting.md`
- Publication policy: `references/publication.md`
- Cheatsheet: `assets/cheatsheet.md`
