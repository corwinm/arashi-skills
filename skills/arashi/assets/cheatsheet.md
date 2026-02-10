# Arashi Skill Cheat Sheet

## Install and Validate

```bash
npx skills add corwinm/arashi-skills
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

## Fast Recovery Sequence

```bash
bash skills/arashi/scripts/validate.sh --check preflight
bash skills/arashi/scripts/validate.sh --check install
bash skills/arashi/scripts/validate.sh --check workflows
```

If any check fails, open `skills/arashi/references/troubleshooting.md` and follow the matching symptom row.
