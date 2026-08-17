# Troubleshooting

When the CLI is installed and the workspace is initialized or otherwise discoverable, start with the narrowest diagnostic:

```bash
arashi doctor --json
arashi <command> --help
```

Otherwise, verify `arashi --version`, choose and initialize the intended mode, then run workspace diagnostics. Preserve the failing command, exit status, structured error code, selected repository scope, and any worktrees already created. Do not retry a mutating command with broader selectors or a different launcher until the failure is understood.

## CLI is missing or exits immediately

**First diagnostic:** run `arashi --version` and identify whether the installation is npm-managed or a standalone binary.

**Recovery:** follow the current installation instructions at https://arashi.haphazard.dev. Node/npm is required only for the npm path. Network access is required only for installation, update checks, or remote operations.

**Escalate:** capture the install channel, platform/architecture, version output, and exit status. Do not replace a working standalone binary merely because Node is absent.

## Update or completion behaves unexpectedly

**First diagnostic:** inspect `arashi update --help` or run `arashi update --check`. For completion, run `command arashi completion <shell>` directly so a wrapper function cannot recurse.

**Recovery:** `arashi completion bash` (or zsh/fish) should produce static completion. Static completion remains available outside configured workspaces. Dynamic completion is intentionally empty when discovery fails or the 200 ms whole-query budget expires; it performs no network requests, hooks, prompts, mutation, or child-repository operations.

If completion generation works but profile activation is missing, run `arashi shell install`. A standalone binary from the same release exposes the same generated completion behavior. See [Setup, update, and completion](commands/setup.md).

## Workspace configuration or status is unhealthy

**First diagnostic:** if the workspace is discoverable, use `arashi doctor --json`, then inspect `arashi status` and `.arashi/config.json` only as directed. If configuration is absent in a fresh workspace, verify `arashi --version`, choose the intended mode, and initialize it first.

**Recovery:** run ordinary `arashi init` for a project adopting configured mode. Preserve an existing configured worktree directory and ignore scope unless the user deliberately changes it. For child repositories or custom paths, follow [Workspace and repositories](commands/workspace.md).

**Escalate:** report the exact failed check and path classification rather than editing `.gitignore`, Git common excludes, or global configuration speculatively.

## Standalone destination is not ignored

**Symptom:** the exact `.worktrees/<branch>` destination is not ignored.

**First diagnostic:** preview `arashi init --zero-config --dry-run`, then verify the exact planned destination:

```bash
current_root=$(git rev-parse --show-toplevel)
git_dir=$(git rev-parse --path-format=absolute --git-dir)
common_dir=$(git rev-parse --path-format=absolute --git-common-dir)
if [ "$git_dir" = "$common_dir" ]; then
  main_root=$current_root
else
  case "$current_root" in
    */.worktrees/*) main_root=${current_root%/.worktrees/*} ;;
    *) printf '%s\n' "Cannot resolve the Arashi main root from $current_root" >&2; exit 1 ;;
  esac
fi
cd "$main_root"
branch=feature/auth
destination=".worktrees/$branch"
git check-ignore --no-index -q -- "$destination"
```

**Recovery:** run `arashi init --zero-config` to append the literal `.worktrees/` rule to the repository-local exclude when safe. Passive discovery does not repair ignore coverage. Do not edit tracked `.gitignore` or global Git configuration automatically.

**Escalate:** if the destination is external, unsafe, or already affected by a different effective rule, stop and show the classification. Adopt configured mode when custom paths or persistent policy are needed.

## SSH alias clone fails to resolve or authenticate

**First diagnostic:** reproduce the remote with Git/OpenSSH. Arashi does not read or probe SSH configuration, resolve aliases independently, or rewrite SSH URLs to HTTPS.

**Recovery:** correct the user's machine-local SSH configuration or Git `url.<base>.insteadOf` rule. Keep a canonical committed remote when shared configuration must work across machines.

**Outcome:** add remains inside its normal add rollback boundary. During clone, clone continues with remaining repositories and reports partial success. See [Workspace and repositories](commands/workspace.md) for exact URL-preservation policy.

## Selection is empty or broader than expected

**First diagnostic:** run the corresponding inspection with the same `--only` and `--group` values. Repeated and comma-separated selectors normalize in encounter order and intersect.

**Recovery:** correct unknown/empty values or choose the intended group. A valid filter with no matches fails closed. Do not remove the selector simply to make the command run.

## Create fails before mutation

**First diagnostic:** inspect the structured error, selected repositories, base resolution, hook validation, and launcher mode. JSON refusals and option conflicts may occur before repository discovery.

**Recovery:** fix all reported preflight failures, then retry with the identical selectors. `REUSE_EXISTING` preserves an existing target; do not reset or recreate it to satisfy a requested base. Use `--no-launch --no-switch` for unattended creation.

## Launch or switch fails

**First diagnostic:** identify the requested/selected launcher and its prerequisite. `LAUNCH_FAILED` means the selected launch was attempted and failed; `TAB_DISPOSITION_UNSUPPORTED` means the selected launcher cannot satisfy an explicit tab request. Neither authorizes fallback.

**Recovery:** fix the requested integration or explicitly choose another supported mode. Preserve exact paths as process arguments; do not invent environment/session identifiers or weaken user security policy.

### tmux

`--tmux` requires an active tmux client or session and a non-empty trimmed `TMUX`. Missing context is detected before creating worktrees. A tmux process failure does not fall back; after create, preserve the created worktrees and report launch failure separately.

### managed Kitty

Managed launch requires Kitty 0.43+ and user-permitted remote control. Diagnose version, permission, exact managed marker, and live session state. `LAUNCH_FAILED` does not permit another launcher. If duplicate exact marked Kitty windows exist, Arashi does not close ambiguous Kitty windows; resolve them manually under the user's Kitty policy.

For an identity-lock failure, another process may own the worktree's cross-process identity lock, the 10-second wait may have expired, or storage may be unavailable. Let a live owner finish and retry. Arashi recovers a dead owner automatically, waits 30 seconds before recovering malformed owner metadata, and uses ownership-safe release so one process cannot delete another process's lock. If launch followed create, preserve the created worktrees.

### Herdr, cmux, or editor

Verify the selected tool's current command contract and genuine managed context. Do not fabricate `HERDR_WORKSPACE_ID`, cmux identifiers, sockets, editor hosts, or tmux state. Default Herdr workspace launch requires a non-bare source checkout; `--tab --herdr` instead requires an active Herdr workspace.

## Hook fails or prompts unexpectedly

**First diagnostic:** identify lifecycle, scope/owner, source kind, execution path, interpreter, input mode, timeout, and exit status. Use [Hooks](hooks.md) for the lifecycle order and environment contract.

**Recovery:** review executable hook content, use the repository's package manager/lockfile, and reproduce the hook from its documented execution directory. Never enter secrets through lifecycle-hook prompts. Use `--no-hook-input` to execute eligible create/remove hooks with immediate EOF, or create-only `--no-hooks` to skip execution deliberately.

**Outcome:** create-hook failure enters the owned rollback boundary; a failing pre-remove stops destructive mutation; post-remove still reports after attempted removal, including partial failures.

## Remove or prune is unsafe

**First diagnostic:** run `arashi remove <target> --dry-run` and inspect branch/worktree ambiguity, dirty state, and hook previews. Use `git worktree list` before pruning stale metadata.

**Recovery:** narrow the target, preserve dirty work, and retry only after the preview matches the request. Use `arashi prune` for stale Git metadata, not as a substitute for reviewing a live worktree.

## Recovery playbook

1. Stop after the first unexplained mutation or partial failure.
2. When workspace discovery is available, record `arashi doctor --json` and `arashi status`; always record the exact command/selectors and Git worktree state.
3. Preserve successful creations and dirty worktrees.
4. Fix the owner-specific prerequisite or policy.
5. Retry with the same narrow scope; verify before widening.
