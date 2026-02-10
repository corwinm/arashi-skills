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
  required_commands: [git, npx]
  optional_commands: [arashi]
entry_commands:
  install: npx skills add https://github.com/corwinm/arashi-skills --skill arashi
  verify: bash skills/arashi/scripts/validate.sh --check all
  workflows:
    beginner: arashi init && arashi status
    intermediate: arashi add <repo-url> && arashi create <branch>
    advanced: arashi pull && arashi sync
visibility: public
status: draft
---

# Arashi Skill

Use this skill to install and validate an Arashi-ready workspace, then run documented workflows for common meta-repository tasks.

## Quick Start

1. Run preflight checks from `references/prerequisites.md`.
2. Run install and verification commands from `references/commands.md`.
3. Choose a workflow from `references/workflows.md` and execute the matching example.
4. If something fails, use `references/troubleshooting.md`.

## Entry Commands

- Install skill package: `npx skills add https://github.com/corwinm/arashi-skills --skill arashi`
- Verify package readiness: `bash skills/arashi/scripts/validate.sh --check all`
- Verify workflow readiness only: `bash skills/arashi/scripts/validate.sh --check workflows`

## Workflow Catalog

- First-run install walkthrough: `examples/install-first-run.md`
- Beginner workflow: `examples/workflow-beginner.md`
- Intermediate workflow: `examples/workflow-intermediate.md`
- Advanced workflow: `examples/workflow-advanced.md`

### Expected Workflow Outcomes

- **Beginner**: workspace initialized and status visible.
- **Intermediate**: repositories added and feature branch worktrees created.
- **Advanced**: repositories synchronized with clear status after reconciliation.

## References

- Prerequisites: `references/prerequisites.md`
- Commands: `references/commands.md`
- Workflows: `references/workflows.md`
- Tutorial: `references/tutorial.md`
- Troubleshooting: `references/troubleshooting.md`
- Publication policy: `references/publication.md`
- Cheatsheet: `assets/cheatsheet.md`
