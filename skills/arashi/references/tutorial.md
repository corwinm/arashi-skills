# End-to-End Integration Tutorial

Follow this tutorial to go from zero setup to one successful Arashi workflow with recovery guidance.

## Step 1: Run Preflight

```bash
git --version
npx --version
git ls-remote https://github.com/corwinm/arashi-skills.git
```

Success criteria:

- All commands return exit code `0`.
- Network check returns remote references.

## Step 2: Install Skill Package

```bash
npx skills add corwinm/arashi-skills
```

Success criteria:

- Install command exits `0`.
- Skill content is present locally.

## Step 3: Validate Gates

```bash
bash skills/arashi/scripts/validate.sh --check all
```

Success criteria:

- Validator prints `PASS` for required checks.
- Gate run completes in under two minutes on a normal connection.

## Step 4: Run First Workflow

Use the beginner workflow:

```bash
arashi init
arashi status
```

Success criteria:

- Arashi config exists.
- Status output renders without errors.

## Step 5: Simulate and Recover from Failure

Simulate missing command condition by opening a shell where `arashi` is not available, then run:

```bash
bash skills/arashi/scripts/validate.sh --check workflows
```

Expected failure:

- Validator reports `FAIL: missing command: arashi`.

Recovery path:

1. Install Arashi via npm or release binary.
2. Confirm with `arashi --version`.
3. Re-run workflow validation gate.

## Completion Criteria

Tutorial is complete when the user can install, validate, run one workflow, simulate a failure, and recover using troubleshooting guidance.
