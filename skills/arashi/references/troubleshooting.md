# Troubleshooting Matrix

Use this matrix to map symptoms to root cause and a deterministic fix.

| Symptom | Likely Cause | Recovery Action |
|---------|--------------|-----------------|
| `npm: command not found` | Node.js/npm not installed or not on `PATH` | Install Node.js LTS, restart shell, rerun `npm --version`. |
| `node: command not found` | Node.js not installed or not on `PATH` | Install Node.js LTS, restart shell, rerun `node --version`. |
| `git: command not found` | Git not installed or not on `PATH` | Install Git, restart shell, rerun `git --version`. |
| `arashi: command not found` | Arashi not installed or install location not on `PATH` | Install Arashi using the website guide at `https://arashi.haphazard.dev`, ensure install location is on `PATH`, then rerun `arashi --version`. |
| Website install steps fail | Network access, permissions, package manager configuration issue, or a bad published release artifact | Retry from stable network, confirm toolchain requirements, and follow the fallback path documented on the website. |
| `arashi --version` exits immediately or returns `137` | Installed binary is invalid for the current platform or a published release artifact is bad | For npm installs, run `arashi install` once to refresh the platform binary; otherwise reinstall using a pinned version from the website guide, verify `arashi --version`, and report the bad release artifact. |
| Repository security checks fail on exception metadata | Exception entry is stale or malformed | Remediate findings or renew exceptions with owner, rationale, and valid expiry metadata. |
| `arashi init` fails | Directory not writable, unsupported bootstrap target, or wrong starting location | Ensure the directory is writable, run `arashi init` from the intended repository root or parent directory, and use `.` or a direct child directory name when prompted. |
| `arashi create` fails due to branch conflict | Branch already exists with incompatible worktree state | Use a unique branch name or remove conflicting worktree, then retry. |
| Workspace health, clone, status, or prune symptoms are unclear | Configuration, repository state, stale worktree metadata, hooks, shell integration, or install/update drift | Run `arashi doctor --json` first and follow the structured finding severities and suggested commands. |
| `arashi remove` reports stale/prunable metadata | Git has a worktree record for a missing directory | Run `arashi doctor --json` first; if it reports stale metadata, use `arashi prune --dry-run --json` to inspect, then `arashi prune --json` to clean. |
| `sesh connect` fails | `sesh` missing or tmux not configured | Install/configure sesh and tmux, or use plain `cd` shortcut flow. |

## Recovery Playbook

1. confirm prerequisites from `references/prerequisites.md`
2. confirm `arashi --version` succeeds
3. run `arashi doctor --json` for structured, non-mutating workspace health diagnostics
4. run lower-level follow-up commands such as `arashi status`, `arashi clone`, or `arashi prune --dry-run --json` only when doctor findings or the symptom point to them
5. run your repository's configured security checks
6. rerun the failing workflow command
7. verify expected outcomes in `references/workflows.md`
