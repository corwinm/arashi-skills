# Remove and maintenance

Preview destructive scope before removal and treat cleanup hooks as explicit lifecycle policy.

Installed `arashi <command> --help` is the parameter authority.

## Remove Cleanup Hooks

Use [Hooks](../hooks.md) for remove lifecycle hook setup and safety guidance.

## Remove Dry-Run Preview

Use `arashi remove --dry-run` before destructive cleanup when you need to confirm what will be removed or deleted:

```bash
# human-readable non-mutating preview
arashi remove feature-auth --dry-run

# machine-readable non-mutating preview for agents/scripts
arashi remove feature-auth --dry-run --json
```

Expected outcomes:

- command exits `0` after producing a removal plan
- no worktree directories are removed
- no local branches are deleted
- confirmation prompts are skipped because dry-run is non-mutating
- `pre-remove` and `post-remove` hooks are discovered/reported but not executed
- JSON output includes `data.dryRun: true`, pending `operations`, `effectiveOptions`, dirty-worktree `blockers`, skipped main worktrees, missing branches, and hook previews

For agent workflows, prefer a dry-run preview before `arashi remove <branch> --force --json` unless the target was just created and is known disposable. Do not treat `--dry-run` as cleanup; run the real remove command only after confirming the plan matches the intended branch/worktrees.

## Stale Worktree Metadata Cleanup

Prefer `arashi doctor --json` first when diagnosing stale worktree or repository health symptoms; use `arashi prune --dry-run --json` only after doctor reports or you already know prunable metadata is the issue.

Use `arashi prune` when Git reports prunable worktree metadata, usually after a worktree directory was removed manually or a Git worktree record points at a missing path.

```bash
# inspect stale metadata without changing Git records
arashi prune --dry-run --json

# clean stale metadata across the workspace
arashi prune --json
```

Expected outcomes:

- `arashi prune --dry-run` reports prunable entries and reasons without mutating Git metadata.
- `arashi prune` cleans stale Git worktree records in the main repository and configured child repositories.
- `arashi remove` excludes prunable records and points users to `arashi prune`; do not use `remove` for already-missing worktrees.
