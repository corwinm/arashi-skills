# First-Time Install Walkthrough

This walkthrough takes a new user from zero setup to one validated Arashi workflow entry point.

## Preconditions

- Terminal available on macOS, Linux, or Windows.
- `git` and `npx` available on `PATH`.

## Steps

1. Verify prerequisites:

   ```bash
   git --version
   npx --version
   ```

2. Install the skill package:

   ```bash
   npx skills add https://github.com/corwinm/arashi-skills --skill arashi
   ```

3. Validate installation readiness:

   ```bash
   bash skills/arashi/scripts/validate.sh --check install
   ```

4. Validate all gates:

   ```bash
   bash skills/arashi/scripts/validate.sh --check all
   ```

5. Proceed to the beginner workflow:

   - Follow `examples/workflow-beginner.md`.

## Expected Outcomes

- Install command exits `0`.
- Validation prints required `PASS` checks.
- User reaches a documented workflow with no manual repository edits.

## Recovery

If any step fails, go to `skills/arashi/references/troubleshooting.md` and follow the matching symptom row.
