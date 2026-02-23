# Arashi Skill Cheat Sheet

## Install and Verify Arashi CLI

```bash
npm install --global arashi@1.7.0
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
cp .arashi/hooks/pre-remove.sh.example .arashi/hooks/pre-remove.sh

# optional post-remove cleanup
cp .arashi/hooks/post-remove.sh.example .arashi/hooks/post-remove.sh
```

## tmux / sesh Shortcuts (Optional)

```bash
arashi list
cd -- "<selected-worktree-path>"
sesh connect "<selected-worktree-path>"
```

More shortcuts: `skills/arashi/references/session-shortcuts.md`
