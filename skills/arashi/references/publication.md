# Publication Policy and Discoverability

Publication is optional. Repository-based distribution is the baseline path.

## Policy

- **Default path**: users discover the skill from repository-based distribution.
- **Optional listing**: publish/list only when account and platform policy permit.
- **Fallback**: when listing is not supported, continue with repository distribution and mark release status as `not_applicable`.

## Discoverability Criteria

Release can be considered discoverable when all criteria are met:

1. Canonical package path resolves: `corwinm/arashi-skills`.
2. `skills/arashi/SKILL.md` is present on default branch.
3. Fresh-environment skill install command succeeds.
4. Arashi CLI install and workflow instructions complete successfully.

## Publication Readiness Checklist

- [ ] `SKILL.md` frontmatter is complete and current.
- [ ] All references linked from `SKILL.md` exist.
- [ ] Arashi install and verification commands are pinned and current.
- [ ] Workflow documentation is present and up to date.
- [ ] Troubleshooting matrix includes prerequisite, network, and command failures.
- [ ] Repository security checks pass according to local policy.

## Verification Steps

1. Create a release tag in this repository.
2. Run the canonical security gate and confirm pass output.
3. From a clean environment, install Arashi CLI using pinned command guidance.
4. Run `arashi --version` and one documented workflow.
5. Record outcomes.

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
