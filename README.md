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
- Arashi CLI install guide: `https://arashi.haphazard.dev`
- Verify Arashi CLI: `arashi --version`
- Official curl installer can offer shell integration during install; use `ARASHI_SHELL_INTEGRATION=yes|no` for unattended runs
- Enable shell integration: `arashi shell install` or `arashi shell init <bash|zsh|fish>`
- Switch worktrees: `arashi switch [--repos|--all] [--cd|--no-cd] [--vscode|--cursor|--kiro|--sesh] [--no-default-launch] [filter]`
- Configure command defaults: set `.arashi/config.json` `defaults.create` / `defaults.switch`

## Workflow Docs

- Overview: `https://arashi.haphazard.dev/workflows/`
- Hooks: `https://arashi.haphazard.dev/workflows/hooks/`
- Config: `https://arashi.haphazard.dev/workflows/config/`
- VS Code and VS Code-based editors: `https://arashi.haphazard.dev/workflows/vscode/`
- tmux and sesh: `https://arashi.haphazard.dev/workflows/tmux-and-sesh/`
- Agents: `https://arashi.haphazard.dev/workflows/agents-and-specs/`

## Security Compliance

- Canonical gate command: `node scripts/security-gate.mjs --root . --exceptions security/audit-exceptions.json`
- Policy and thresholds: `security/policy.md`
- Baseline findings and remediation tracking: `security/baseline-findings.md`
- Exception metadata file: `security/audit-exceptions.json`
- Exception workflow: `security/exceptions.md`

## Skill Entry Point

- Manifest: `skills/arashi/SKILL.md`
- References index: `skills/arashi/README.md`

## Related Repositories

- Arashi implementation: [github.com/corwinm/arashi](https://github.com/corwinm/arashi)
- Specs and planning: [github.com/corwinm/arashi-arashi](https://github.com/corwinm/arashi-arashi)
