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
| Standalone `arashi create` reports that the exact `.worktrees/<branch>` destination is not ignored | The root convention exists, but Git's effective tracked, repository-local, or existing global rules do not cover this branch destination | Run `arashi init --zero-config`, then verify the exact destination with `git check-ignore --no-index`. Do not automatically edit tracked `.gitignore`, a global excludes file, or global Git configuration. |
| A repository has `.worktrees/`, but ignore coverage remains missing | Passive discovery does not repair standalone bootstrap state | Run `arashi init --zero-config` to repair the repository-local exclude, then rerun `arashi doctor --json`. |
| A standalone command rejects child repositories, groups, or coordination | `add`, `clone`, `sync`, `pull`, `push`, `exec`, and `setup`, plus repository/group selectors, require persisted configured state | Upgrade with ordinary `arashi init`; do not treat standalone mode as an empty configured workspace. |
| Managed repository or worktree paths appear as untracked, or managed ignore state may be stale | A safe configured path lacks an effective rule, an Arashi-owned entry is stale, or `none` is selected | Run `arashi doctor --json` and follow its non-mutating finding. If repository-local management is intended, run `arashi init --ignore-scope local`; rerun doctor to verify. |
| `.gitignore` changes during `init`, `pull`, `clone`, `add`, or `create` | The clone-local `tracked` preference is active and reconciliation added a missing safe rule or removed a stale Arashi-owned rule | Confirm the tracked rule changes are intended for the team. Keep them if intentional, or run `arashi init --ignore-scope local` to restore the local default for later reconciliation. |
| Managed ignore reconciliation reports an invalid stored scope | Clone-local `arashi.ignoreScope` contains an unsupported value | Run `arashi doctor --json`, follow its Git-config repair guidance, then explicitly select `arashi init --ignore-scope local`, `tracked`, or `none`. Do not put the preference in `.arashi/config.json`. |
| A global ignore rule already covers a managed path | Git reports an existing effective rule through the user's global excludes file | Leave the effective rule in place; Arashi should not duplicate it. Never create, edit, or unset global Git configuration as an Arashi repair. |
| Managed ignore reconciliation skips a path as unsafe | `reposDir` or `worktreesDir` resolves to repository root, an absolute path, or parent traversal | Choose a safe repository-relative subdirectory in workspace configuration, then rerun the lifecycle command and `arashi doctor --json`. Do not add the broad path automatically to any ignore file. |
| `arashi create` fails due to branch conflict | Branch already exists with incompatible worktree state | Use a unique branch name or remove conflicting worktree, then retry. |
| Workspace health, clone, status, or prune symptoms are unclear | Configuration, repository state, stale worktree metadata, hooks, shell integration, or install/update drift | Run `arashi doctor --json` first and follow the structured finding severities and suggested commands. |
| `arashi remove` reports stale/prunable metadata | Git has a worktree record for a missing directory | Run `arashi doctor --json` first; if it reports stale metadata, use `arashi prune --dry-run --json` to inspect, then `arashi prune --json` to clean. |
| `sesh connect` fails | `sesh` missing or tmux not configured | Install/configure sesh and tmux, or use plain `cd` shortcut flow. |

For an exact standalone create ignore check, resolve the main worktree, substitute the branch, and require the final command to exit `0`:

```bash
root="$(git -c core.quotePath=false worktree list --porcelain | sed -n '1s/^worktree //p')"
cd "$root" || exit 1
branch=feature/example
destination=".worktrees/$branch"
git check-ignore --no-index -v -- "$destination"
```

If it exits non-zero, run `arashi init --zero-config`. Do not automatically edit tracked `.gitignore`, a global excludes file, or global Git configuration.

## Recovery Playbook

1. confirm prerequisites from `references/prerequisites.md`
2. confirm `arashi --version` succeeds
3. run `arashi doctor --json` for structured, non-mutating workspace health diagnostics
4. run lower-level follow-up commands such as `arashi status`, `arashi clone`, or `arashi prune --dry-run --json` only when doctor findings or the symptom point to them
5. run your repository's configured security checks
6. rerun the failing workflow command
7. verify expected outcomes in `references/workflows.md`
