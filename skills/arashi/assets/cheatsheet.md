# Arashi Skill Cheat Sheet

## Install and Verify Arashi CLI

```bash
curl -fsSL https://arashi.haphazard.dev/install | bash
npm install -g arashi # fallback
arashi --version
arashi --help
```

## Core Workflow Commands

```bash
arashi init
arashi add <repo-url>
arashi clone [--all]
arashi create <branch>
arashi list
arashi switch
arashi switch --repos <repo-name>
arashi switch --all
arashi status
arashi pull
arashi sync
```

## Remove Hook Setup

```bash
cp .arashi/hooks/pre-remove.sh.example .arashi/hooks/pre-remove.sh
chmod +x .arashi/hooks/pre-remove.sh

# optional post-remove cleanup
cp .arashi/hooks/post-remove.sh.example .arashi/hooks/post-remove.sh
chmod +x .arashi/hooks/post-remove.sh
```

## tmux / sesh Shortcuts (Optional)

```bash
cd "$(arashi list | fzf)"
sesh connect "$(arashi list | fzf)"
```

More shortcuts: `skills/arashi/references/session-shortcuts.md`
