# Arashi Skill Cheat Sheet

## Install Arashi and Validate

```bash
npm install -g arashi
arashi --version
bash skills/arashi/scripts/validate.sh --check all
```

Expected output: `PASS` lines for required gates and final completion message.

## Gate-Specific Validation

```bash
bash skills/arashi/scripts/validate.sh --check preflight
bash skills/arashi/scripts/validate.sh --check install
bash skills/arashi/scripts/validate.sh --check workflows
```

## Core Arashi Commands

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

## Fast Recovery Sequence

```bash
bash skills/arashi/scripts/validate.sh --check preflight
bash skills/arashi/scripts/validate.sh --check install
bash skills/arashi/scripts/validate.sh --check workflows
```

If any check fails, open `skills/arashi/references/troubleshooting.md` and follow the matching symptom row.
