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
| `--tmux` requires an active tmux client or session | `TMUX` is absent, empty, or whitespace-only | Run the command from an active tmux client or session, or explicitly choose a different launcher. For `create --tmux`, this preflight fails before creating worktrees or running create hooks; Arashi does not fall back. |
| Explicit tmux launch reports `LAUNCH_FAILED` | `tmux new-window` failed after tmux context validation | Fix the tmux/process error and retry intentionally. Arashi does not fall back; after `create --tmux`, preserve the created worktrees because launch failure does not roll them back. |
| Herdr launch reports that the command is unavailable | Herdr is not installed or is not on `PATH` | Install a Herdr release compatible with the verified v0.7.4 command contract, rerun `herdr --version`, then retry. Arashi does not fall back after Herdr is selected. |
| Herdr launch reports a server or socket failure | The Herdr CLI cannot reach a running default session/server | Start or restore the intended Herdr session, verify access from the same shell, and retry. Do not force another launcher unless the user chooses one explicitly. |
| Herdr launch reports an invalid response | The installed Herdr CLI/server does not match the validated `worktree_opened` JSON contract | Compare the CLI/server with the verified Herdr v0.7.4 contract and confirm a compatible running server. Treat `LAUNCH_FAILED` as a real failure; do not assume the workspace opened. |
| Herdr launch reports that no non-bare source checkout is available | The repository is bare and cannot provide Herdr's required main-checkout `--cwd` | Create or use a non-bare main checkout before retrying. If this followed `arashi create --herdr`, keep the successfully created worktrees; Arashi does not roll them back. |
| A Herdr workspace remains after `arashi remove` | Arashi intentionally does not close Herdr workspaces because they may contain agents or unsaved terminal state | Close it manually with `herdr workspace close <workspace-id>`. For opt-in automation, resolve the ID while the checkout exists and run that command from a pre-remove hook; never use `herdr worktree remove`. |
| Managed Kitty launch reports a version or remote control failure | Kitty is older than Kitty 0.43+, `kitten` is unavailable, or the user's remote control permission/password policy denied access | Run `kitten --version`, upgrade if needed, and review Kitty's `allow_remote_control` and password policy. Preserve the actionable `LAUNCH_FAILED`; Arashi does not fall back after Kitty is selected. |
| Managed Kitty launch reports duplicate exact marked Kitty windows | More than one live window carries the worktree's exact Arashi identity marker | Inspect the named windows in Kitty and close the unintended duplicate manually. Arashi fails closed and does not close ambiguous Kitty windows or silently choose one. |
| Managed Kitty post-create launch fails | Version, permission, structured-state validation, focus, or launch failed after worktree creation | Fix the reported Kitty cause and retry intentionally. Preserve the created worktrees; Arashi reports partial success and does not roll them back or switch to a generic terminal. |
| A Kitty window remains after `arashi remove` | Managed Kitty sessions are live-only and Kitty owns its windows | Close the window manually in Kitty if desired. Arashi does not generate session files or perform remove-time or automatic window cleanup. |

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
