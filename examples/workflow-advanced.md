# Advanced Workflow: Synchronize and Recover

## Goal

Bring all managed repositories up to date and recover from drift using safe pull/sync flows.

## Command Sequence

```bash
arashi pull
arashi sync
arashi status
```

## Expected Outcomes

- Remotes are fetched and local branches are updated where possible.
- Sync completes without leaving repositories in partially updated states.
- `arashi status` reports clean or actionable follow-up steps.

## Failure Checkpoints

- If `pull` reports auth/network issues, fix Git credentials/network and retry.
- If `sync` reports conflicts, resolve conflicts in affected repositories and re-run `arashi sync`.
