# arashi-skills

Dedicated skills package repository for Arashi.

## Purpose

This repository provides the Arashi skill package used by `skills.sh` users to:

- install Arashi integration assets with a predictable first-run flow
- run pre-configured workflows for common meta-repository tasks
- self-serve troubleshooting and validation before raising support issues

Implementation code for the Arashi CLI remains in [`repos/arashi`](../arashi/README.md). This repository focuses on skill metadata, guided workflows, examples, and integration documentation.

## Repository Layout

```text
.
├── skills/
│   └── arashi/
│       ├── SKILL.md
│       ├── references/
│       ├── assets/
│       └── scripts/
└── examples/
```

## Contribution Notes

1. Keep commands deterministic and copy-pasteable across macOS, Linux, and Windows terminals.
2. Update `skills/arashi/SKILL.md` first, then sync linked references.
3. Include expected outcomes for every workflow or troubleshooting instruction.
4. Validate the package with `bash skills/arashi/scripts/validate.sh --check all` before publishing changes.

## Canonical Commands

- Install: `npx skills add https://github.com/corwinm/arashi-skills --skill arashi`
- Verify: `bash skills/arashi/scripts/validate.sh --check all`
- Workflow gate only: `bash skills/arashi/scripts/validate.sh --check workflows`

## Related Repositories

- Arashi implementation: [github.com/corwinm/arashi](https://github.com/corwinm/arashi)
- Specs and planning: [github.com/corwinm/arashi-arashi](https://github.com/corwinm/arashi-arashi)
