# Arashi Skill Package

This directory contains the canonical Arashi skill definition and all supporting artifacts used by `skills.sh`.

## Scope

- Skill identity, routing, operating policy, and reference links in `SKILL.md`
- Detailed prerequisite, command, workflow, troubleshooting, publication, and tutorial references
- User-facing assets such as quick cheat sheets
- Session shortcut guidance for `fzf`, `tmux`, and `sesh`
- In-skill security guidance for safe install and command usage

## Artifact Index

- `SKILL.md`: Canonical skill manifest with minimal routing, operating policy, and links
- `references/prerequisites.md`: Environment checks and pass criteria
- `references/commands.md`: Verification, workflow, and publication commands
- `references/workflows.md`: Workflow catalog and selection guidance
- `references/hooks.md`: Remove lifecycle hook setup and safety guidance
- `references/session-shortcuts.md`: fzf/tmux/sesh navigation shortcuts
- `references/troubleshooting.md`: Symptom-to-fix matrix
- `references/tutorial.md`: End-to-end onboarding tutorial
- `references/publication.md`: Publication policy and readiness gates
- `assets/cheatsheet.md`: Lightweight reference index

## Command Contract Maintenance

The repository-level `contracts/command-coverage.json` file is synchronized with the CLI's top-level command contract. Every command must have exactly one entry: use `covered` with a valid reference relative to `skills/arashi/`, or `excluded` with a stable, non-empty `reason`. Classify standalone behavior as `supported`, `configured-only`, `conditional`, or `not-applicable`, and include a reason unless it is supported directly. The manifest is intentionally outside `skills/` so installed skills do not ship maintainer-only validation metadata, and it remains separate from the curated prose in `references/`; do not turn the prose into an exhaustive generated command catalog.

`install` is intentionally excluded because it is a bootstrap-only installer command, not a normal post-install workflow. Keep platform-aware installation guidance on the canonical docs site and preserve that rationale in the manifest.

## Related Docs

- Workflow guides: `https://arashi.haphazard.dev/workflows/`
- Hooks guide: `https://arashi.haphazard.dev/workflows/hooks/`
- Config guide: `https://arashi.haphazard.dev/workflows/config/`
- VS Code guide: `https://arashi.haphazard.dev/workflows/vscode/`
- tmux and sesh guide: `https://arashi.haphazard.dev/workflows/tmux-and-sesh/`
- Agents guide: `https://arashi.haphazard.dev/workflows/agents-and-specs/`
