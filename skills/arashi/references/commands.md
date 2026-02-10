# Command Reference

This document defines canonical install, verification, workflow, and publication commands.

## Most Common Commands

```bash
# install
npx skills add https://github.com/corwinm/arashi-skills --skill arashi

# full validation
bash skills/arashi/scripts/validate.sh --check all

# workflow-only readiness
bash skills/arashi/scripts/validate.sh --check workflows
```

## Installation

```bash
npx skills add https://github.com/corwinm/arashi-skills --skill arashi
```

Expected outcome:

- Command exits `0`.
- Skill files are available under `skills/arashi/`.

## Verification

Run all validation gates:

```bash
bash skills/arashi/scripts/validate.sh --check all
```

Run only install gate:

```bash
bash skills/arashi/scripts/validate.sh --check install
```

Expected outcome:

- Required checks print `PASS`.
- Command exits `0` when gates pass.

## Workflow Execution

Choose one workflow from `references/workflows.md` and execute commands in order.

Order of operations:

1. Run workflow readiness validation.
2. Execute one workflow from start to finish.
3. Confirm the documented expected outcomes.

Use workflow readiness check before running examples:

```bash
bash skills/arashi/scripts/validate.sh --check workflows
```

## Publication and Discoverability

Publication is optional and policy-dependent.

```bash
git tag -a skill-arashi-v0.1.0 -m "arashi skill package v0.1.0"
git push origin skill-arashi-v0.1.0
```

After release, validate discoverability from a clean environment:

```bash
npx skills add https://github.com/corwinm/arashi-skills --skill arashi
```

If listing/publication is unavailable for your account policy, mark status as `not_applicable` in release notes and continue with repository-based install instructions.
