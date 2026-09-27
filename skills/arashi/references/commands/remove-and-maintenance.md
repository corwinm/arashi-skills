# Remove and maintenance

Preview destructive scope before removal and treat cleanup hooks as explicit lifecycle policy.

Installed `aw <command> --help` is the parameter authority.

## Finish a Coordinated Workspace

Use `aw finish` to assess **one configured coordinated workspace** before retiring it; use `aw remove` when you only intend removal, not a completion assessment. From a registered parent or child worktree, finish targets that parent; from main, name an unambiguous registered target (a human TTY may select one). JSON/non-TTY requires an explicit target. It does not merge, push, delete remote branches, or finish standalone/main worktrees.

```bash
# assess without cleanup; fetches relevant remote metadata into disposable state
aw finish feature-auth --dry-run
aw finish feature-auth --dry-run --json

# execute only after reviewing the assessment and consenting to required judgments/discards
aw finish feature-auth
```

Before cleanup:

- Review every participant, including children on different branches, its HEAD/local changes/upstream/base, and the exact ordered removal and hook plan. Absent children do not participate.
- Treat omitted bases, failed refreshes, incomplete history, and PR correlation as unknown—not proof. Never infer completion from cached refs or create-time overrides; ancestry proof does not detect later reverts.
- Unknown completion needs a named target and interactive manual judgment, not an agent-supplied assertion. JSON/non-TTY cannot provide it, and a successful preview is not cleanup authorization.
- Obtain separate discard consent for dirty/untracked/ignored files and unpublished or unknown upstream state. `--force` covers discard and removal confirmation only, never unknown completion or topology/identity blockers.
- If revalidation or hooks fail, inspect the reported outcome and survivors before retrying. Hook side effects and partial removal have no rollback or cross-process atomicity guarantee.

See the canonical [finish guide](https://arashi.haphazard.dev/commands/finish/) for evidence, revalidation, flags, and output details; [Work on a Change](https://arashi.haphazard.dev/workflows/change-lifecycle/) covers the wider workflow.

## Remove Cleanup Hooks

Use [Hooks](../hooks.md) for remove lifecycle hook setup and safety guidance.

## Remove Dry-Run Preview

Use `aw remove --dry-run` before destructive cleanup when you need to confirm what will be removed or deleted:

```bash
# human-readable non-mutating preview
aw remove feature-auth --dry-run

# machine-readable non-mutating preview for agents/scripts
aw remove feature-auth --dry-run --json
```

Expected outcomes:

- command exits `0` after producing a removal plan
- no worktree directories are removed
- no local branches are deleted
- confirmation prompts are skipped because dry-run is non-mutating
- `pre-remove` and `post-remove` hooks are discovered/reported but not executed; hook previews preserve plain lifecycle/repository identity, report the exact selected source path for the qualified or child-local alias, and block overlap or ambiguity before mutation
- JSON output includes `data.dryRun: true`, pending `operations`, `effectiveOptions`, dirty-worktree `blockers`, skipped main worktrees, missing branches, and hook previews

For agent workflows, prefer a dry-run preview before `aw remove <branch> --force --json` unless the target was just created and is known disposable. Do not treat `--dry-run` as cleanup; run the real remove command only after confirming the plan matches the intended branch/worktrees.

## Stale Worktree Metadata Cleanup

Prefer `aw doctor --json` first when diagnosing stale worktree or repository health symptoms; use `aw prune --dry-run --json` only after doctor reports or you already know prunable metadata is the issue.

Use `aw prune` when Git reports prunable worktree metadata, usually after a worktree directory was removed manually or a Git worktree record points at a missing path.

```bash
# inspect stale metadata without changing Git records
aw prune --dry-run --json

# clean stale metadata across the workspace
aw prune --json
```

Expected outcomes:

- `aw prune --dry-run` reports prunable entries and reasons without mutating Git metadata.
- `aw prune` cleans stale Git worktree records in the main repository and configured child repositories.
- `aw remove` excludes prunable records and points users to `aw prune`; do not use `remove` for already-missing worktrees.
