# Remove and maintenance

Preview destructive scope before removal and treat cleanup hooks as explicit lifecycle policy.

Installed `aw <command> --help` is the parameter authority.

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
