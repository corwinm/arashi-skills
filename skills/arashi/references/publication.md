# Publication Policy and Discoverability

Publication is optional. Repository-based installation is always the baseline distribution path.

## Policy

- **Default path**: users install via `npx skills add https://github.com/corwinm/arashi-skills --skill arashi`.
- **Optional listing**: publish/list only when account and platform policy permit.
- **Fallback**: when listing is not supported, continue with repository install and mark release status as `not_applicable`.

## Discoverability Criteria

Release can be considered discoverable when all criteria are met:

1. Canonical package path resolves: `corwinm/arashi-skills`.
2. `skills/arashi/SKILL.md` is present on default branch.
3. Fresh-environment install command succeeds.
4. Verification command completes with passing gates.

## Publication Readiness Checklist

- [ ] `SKILL.md` frontmatter is complete and current.
- [ ] All references linked from `SKILL.md` exist.
- [ ] Validation script passes for `--check all`.
- [ ] At least three workflow examples are present and up to date.
- [ ] Troubleshooting matrix includes prerequisite, network, and command failures.

## Verification Steps

1. Create a release tag in this repository.
2. From a clean environment, run installation command.
3. Run `bash skills/arashi/scripts/validate.sh --check all`.
4. Complete one documented workflow and record outcomes.

If any step fails because listing support is unavailable, record publication status as `not_applicable` with the blocking policy details.

## Release Evidence Template

Use this template in release notes:

```text
Publication Status: ready | published | not_applicable | failed
Release Reference: <tag-or-commit>
Install Verification: pass | fail
Workflow Verification: pass | fail
Discoverability Proof: <link-or-note>
Policy Notes: <optional account/platform constraints>
```
