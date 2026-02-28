# Arashi Skill Cheat Sheet

## Install and Verify Arashi CLI

Install instructions: https://arashi.haphazard.dev

```bash
arashi --version
arashi --help
```

## Core Workflow Commands

```bash
arashi init
arashi add <repo-url>
arashi clone [--all]
arashi create <branch>
arashi create <branch> [--launch|--no-launch] [--switch|--no-switch] [--sesh]
arashi list
arashi switch
arashi switch --repos <repo-name>
arashi switch --all
arashi switch --no-default-launch
arashi status
arashi pull
arashi sync
```

## Remove Hook Setup

```bash
# workspace-root remove hooks
cp .arashi/hooks/pre-remove.sh.example .arashi/hooks/pre-remove.sh

# optional post-remove cleanup
cp .arashi/hooks/post-remove.sh.example .arashi/hooks/post-remove.sh

# repo-scoped remove hook
mkdir -p repos/<repo>/.arashi/hooks
cp .arashi/hooks/pre-remove.sh.example repos/<repo>/.arashi/hooks/pre-remove.sh

# global shared remove hook
mkdir -p ~/.arashi/hooks
cp .arashi/hooks/pre-remove.sh.example ~/.arashi/hooks/pre-remove.sh
```

## tmux / sesh Shortcuts (Optional)

```bash
arashi list
cd -- "<selected-worktree-path>"
sesh connect "<selected-worktree-path>"
```

More shortcuts: `skills/arashi/references/session-shortcuts.md`
