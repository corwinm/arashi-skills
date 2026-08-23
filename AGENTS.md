# Arashi Skills Agent Rules

This repository contains the Arashi skill package and supporting references.

## Scope

- Keep skill definitions under `skills/`.
- Keep supporting scripts, policy, and security files in their existing top-level directories.
- Keep `skills/arashi/SKILL.md` minimal: routing, policy, and links only.
- Update skill references when detailed workflow guidance or canonical docs links change.

## Working Rules

- Keep commands deterministic and copy-pasteable.
- Use `aw` for documented workflows and treat `aw --help` and `aw <command> --help` as the source of truth for current command parameters. The `arashi` executable remains supported for existing scripts and workflows.
- Update the smallest affected reference first for detailed procedural changes.
- Update `skills/arashi/SKILL.md` only when skill routing, operating policy, or reference links change.
- Keep skill references self-contained and aligned with the canonical docs site.
