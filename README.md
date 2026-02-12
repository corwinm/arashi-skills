# arashi-skills

Dedicated skills package repository for Arashi.

```bash
npx skills add https://github.com/corwinm/arashi-skills --skill arashi
```

## Purpose

This repository provides the Arashi skill package used by `skills.sh` users to:

- install and use the Arashi CLI with a predictable first-run flow
- run pre-configured workflows for common meta-repository tasks
- self-serve troubleshooting before raising support issues

Implementation code for the Arashi CLI remains in [`repos/arashi`](../arashi/README.md). This repository focuses on skill metadata and integration documentation that ships with the installed skill.

## Repository Layout

```text
.
├── skills/
│   └── arashi/
│       ├── SKILL.md
│       ├── references/
│       └── assets/
```

## Contribution Notes

1. Keep commands deterministic and copy-pasteable across macOS, Linux, and Windows terminals.
2. Update `skills/arashi/SKILL.md` first, then sync linked references.
3. Include expected outcomes for every workflow or troubleshooting instruction.
4. Keep skill references self-contained under `skills/arashi/`.

## Canonical Commands

- Install: `npx skills add https://github.com/corwinm/arashi-skills --skill arashi`
- Install Arashi CLI (macOS/Linux): `curl -fsSL https://arashi.haphazard.dev/install | bash`
- Install Arashi CLI fallback (all platforms): `npm install -g arashi`
- Verify Arashi CLI: `arashi --version`

## Skill Entry Point

- Manifest: `skills/arashi/SKILL.md`
- References index: `skills/arashi/README.md`

## Related Repositories

- Arashi implementation: [github.com/corwinm/arashi](https://github.com/corwinm/arashi)
- Specs and planning: [github.com/corwinm/arashi-arashi](https://github.com/corwinm/arashi-arashi)
