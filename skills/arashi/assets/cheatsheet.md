# Arashi Skill Cheat Sheet

## Install and Verify Arashi CLI

```bash
npm install -g arashi
arashi --version
arashi --help
```

## Core Workflow Commands

```bash
arashi init
arashi add <repo-url>
arashi create <branch>
arashi list
arashi status
arashi pull
arashi sync
```

## tmux / sesh Shortcuts (Optional)

```bash
cd "$(arashi list | fzf)"
sesh connect "$(arashi list | fzf)"
```

More shortcuts: `skills/arashi/references/session-shortcuts.md`
