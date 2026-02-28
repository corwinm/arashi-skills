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

This skill helps you install and use the `arashi` CLI to manage multi-repository workflows and is best paired with a spec-driven development framework to provide shared context for AI-assisted engineering.

## When to Use This Skill

Use this skill when the user wants to:

- set up Arashi quickly with a documented, repeatable install flow
- choose a workflow by difficulty (beginner, intermediate, advanced)
- validate readiness before running commands across multiple repositories
- switch quickly between parent and child worktrees with `arashi switch`
- speed up daily navigation with `fzf`, `tmux`, and `sesh`
- automate cleanup around `arashi remove` with lifecycle hooks
- recover from setup, network, or command failures without guesswork

## Core Commands

Installation guidance: https://arashi.haphazard.dev

```bash
# verify Arashi is available
arashi --version

# inspect command surface
arashi --help
```

## Usage Rules

When guiding a user, always:

1. Run preflight checks before installing Arashi CLI.
2. Point users to the website install guide instead of embedding installer commands in the skill.
3. Confirm `arashi --version` before running workflows.
4. Confirm expected outcomes after each workflow step.
5. Route failures through the troubleshooting matrix before retrying.
6. Verify provenance/checksums for downloaded binaries before execution.
7. Review hook scripts before enabling `pre-remove.sh` or `post-remove.sh` across repository, workspace, or global hook scopes.

## Workflow Catalog

- Beginner: initialize workspace and inspect status.
- Intermediate: clone missing repositories and create a feature branch.
- Advanced: pull and sync repositories safely.
- Session shortcuts: jump or connect with `arashi switch`, `fzf`, and `sesh` in tmux-based flows.

### Expected Workflow Outcomes

- **Beginner**: workspace initialized and status visible.
- **Intermediate**: missing clones recovered and feature branch worktrees created.
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
