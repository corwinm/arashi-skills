# Command Reference

This document defines canonical Arashi CLI install, verification, workflow, and publication commands.

## Most Common Commands

```bash
# install Arashi CLI
npm install -g arashi

# verify Arashi CLI
arashi --version

# full validation
bash skills/arashi/scripts/validate.sh --check all

# workflow-only readiness
bash skills/arashi/scripts/validate.sh --check workflows
```

## Installation

Install Arashi CLI with npm:

```bash
npm install -g arashi
```

Alternative install from GitHub Releases:

```bash
curl -L https://github.com/corwinm/arashi/releases/latest/download/arashi-macos-arm64 -o arashi
chmod +x arashi
sudo mv arashi /usr/local/bin/arashi
```

Expected outcome:

- Command exits `0`.
- `arashi --version` returns a version string.

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

Use workflow readiness check before running workflows:

```bash
bash skills/arashi/scripts/validate.sh --check workflows
```

## Session Navigation (Optional)

For tmux/sesh and worktree jump shortcuts, use:

- `references/session-shortcuts.md`

## Publication and Discoverability

Publication is optional and policy-dependent.

```bash
git tag -a skill-arashi-v0.1.0 -m "arashi skill package v0.1.0"
git push origin skill-arashi-v0.1.0
```

After release, validate that Arashi installation and validation commands remain accurate for new users.
