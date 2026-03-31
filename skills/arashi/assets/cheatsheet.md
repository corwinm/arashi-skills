# Arashi Skill Cheat Sheet

## Install and Verify Arashi CLI

Install instructions: https://arashi.haphazard.dev

```bash
arashi --version
arashi --help
```

## Core Workflow Commands

Run `arashi init` inside an existing repository root, or from a parent directory and answer the repository target prompt with `.` or a child name.

```bash
arashi init
arashi add <repo-url>
arashi clone [--all]
arashi create <branch>
arashi create <branch> [--launch|--no-launch] [--switch|--no-switch] [--sesh]
arashi shell install
arashi shell init <bash|zsh|fish>
arashi list
arashi switch
arashi switch --cd <filter>
arashi switch --repos <repo-name>
arashi switch --all
arashi switch --cursor <filter>
arashi switch --vscode <filter>
arashi switch --kiro <filter>
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
