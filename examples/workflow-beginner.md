# Beginner Workflow: First Workspace Status Check

## Goal

Initialize Arashi in the current meta-repository and inspect workspace state.

## Command Sequence

```bash
arashi init
arashi status
```

## Expected Outcomes

- `.arashi/config.json` exists after `arashi init`.
- `arashi status` prints repository/worktree status without errors.

## Failure Checkpoints

- If `arashi` command is unavailable, install Arashi and verify `arashi --version`.
- If `init` fails, ensure current directory is writable and inside the intended workspace root.
