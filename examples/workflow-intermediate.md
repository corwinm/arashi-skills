# Intermediate Workflow: Multi-Repository Feature Branch

## Goal

Add repositories and create a shared feature branch across managed worktrees.

## Command Sequence

```bash
arashi add git@github.com:your-org/frontend.git
arashi add git@github.com:your-org/backend.git
arashi create feature/skill-integration
arashi list
```

## Expected Outcomes

- Repositories are registered in `.arashi/config.json`.
- New worktrees exist for `feature/skill-integration`.
- `arashi list` shows all active worktree paths.

## Failure Checkpoints

- If `arashi add` fails, verify SSH/Git access to each repository.
- If `arashi create` fails, resolve branch naming conflicts and retry.
