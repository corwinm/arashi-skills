# Lifecycle Hooks

Hooks execute user-controlled code. Prefer configured mode for repository-local or workspace policy; use standalone mode only for ad hoc use with already-established user-global hooks. The installed `arashi create --help` and `arashi remove --help`, plus the installed configuration schema, are authoritative.

## Activate One Example

Review an example before making it executable. Activate exactly one platform-native candidate per logical location:

```bash
install -m 755 .arashi/hooks/pre-create.sh.example .arashi/hooks/pre-create.sh
```

```powershell
Copy-Item .arashi/hooks/pre-create.ps1.example .arashi/hooks/pre-create.ps1
```

Ordinary `arashi init` generates inert `.example` hook files but does not activate them. Keep examples inert until reviewed; do not embed or enter secrets in hook files, inline configuration, or prompts.

## Discovery and ownership

Configured create does not discover repository-local or user-global hooks. Native file ownership is explicit:

| Lifecycle scope | Native file location |
| --- | --- |
| Configured create, workspace | `<workspace>/.arashi/hooks/pre-create<ext>` and `post-create<ext>` |
| Configured create, repository-specific | `<workspace>/.arashi/hooks/pre-create.<repo><ext>` and `post-create.<repo><ext>`; execution still occurs in the new child worktree |
| Configured remove, repository | `<repo>/.arashi/hooks/pre-remove<ext>` and `post-remove<ext>`; the default configured path is `repos/<repo>/.arashi/hooks/` |
| Configured remove, workspace | `<workspace>/.arashi/hooks/pre-remove<ext>` and `post-remove<ext>` |
| Configured remove, global targeted | `~/.arashi/hooks/<repo>/pre-remove<ext>` and `post-remove<ext>` |
| Configured remove, global shared | `~/.arashi/hooks/pre-remove<ext>` and `post-remove<ext>` |

Standalone mode discovers only user-global targeted and shared hooks: `~/.arashi/hooks/<main-root-basename>/<lifecycle><ext>` before `~/.arashi/hooks/<lifecycle><ext>`. The main-root basename identifies the main repository; repository-local or workspace-root `.arashi/hooks` content is inactive without configured workspace state.

POSIX discovers only `.sh`; Windows discovers `.ps1`, `.cmd`, and `.bat` case-insensitively. Multiple supported candidates for one logical location fail before lifecycle mutation. Windows does not run `.sh` lifecycle hooks through implicit Git Bash.

Platform execution is fixed:

- PowerShell: `powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File <absolute-script-path>`
- cmd: `cmd.exe /d /e:on /v:off /s /c call <encoded-absolute-script-path>`

## Configured Inline Hooks

Configured workspaces define `hooks.scripts.<lifecycle>` for workspace ownership or `repos.<name>.hooks.<lifecycle>` for repository ownership across `pre-create`, `post-create`, `pre-remove`, and `post-remove`.

```json
{
  "hooks": {
    "scripts": {
      "pre-create": {
        "cmd": "echo Inline pre-create hook running || exit /b 1"
      }
    }
  },
  "repos": {
    "api": {
      "hooks": {
        "post-create": "set -eu; CI=true corepack pnpm --ignore-workspace install --frozen-lockfile"
      }
    }
  }
}
```

A string is Bash shorthand. Explicit interpreter objects support `bash`, `powershell`, and `cmd`. POSIX scans non-empty `PATH` entries in order for executable `bash` and uses the first absolute real path. Windows selects `powershell`, then `cmd`, then `bash`; when one is unavailable it tries the next configured candidate and otherwise reports `interpreter_unavailable` before mutation. PowerShell and cmd resolve only from fixed executable paths beneath `%SystemRoot%`, while Windows Bash scans non-empty `PATH` entries for `bash.exe`. Terminal applications, `pwsh`, aliases, empty path entries, and unconfigured interpreters are not fallbacks.

Use inline hooks for short reviewable commands and external files for substantial, reusable scripts. Inline configuration is executable code. An inline value and its corresponding native file are ambiguous: create, remove, remove dry-run, and doctor fail before mutation and execute neither source. Inline sources preserve native-file lifecycle timing, cwd, multiplicity, timeout, input, failure, rollback/finalization, and ordered outcomes. Standalone and user-global hooks remain native-file only.

Inline metadata reports `sourceKind: "inline-config"`, `sourceOwnerKind`, and `sourceOwnerName`; `sourceScriptPath` is `null` or omitted. Outcomes, previews, diagnostics, and logs never disclose snippet text.

File hooks receive `ARASHI_HOOK_SOURCE_PATH` as their absolute source path. Inline hooks omit `ARASHI_HOOK_SOURCE_PATH`; no path-like replacement is invented.

## Create lifecycle

| Scope | Order | Working directory |
| --- | --- | --- |
| Workspace `pre-create` | Once per command, before branch or worktree mutation | Configured workspace root |
| Repository `pre-create.<repo>` | After that child worktree is materialized, before its repository setup | New child worktree |
| Repository `post-create.<repo>` | After that repository pre-create hook | New child worktree |
| Workspace `post-create` | Once after coordinated Git creation, before move-changes or switch/launch handling | Configured workspace root |

Create hooks are fail-fast; later success cannot mask an earlier failure. Create-hook validation, timeout, or nonzero failure fails create and enters the owned Git rollback boundary.

Configured-create dry-run performs no hook discovery, returns an empty hook ledger, and has no hook preview surface. `--no-hooks` is create-only and remove does not accept it.

## Remove lifecycle

Remove discovery/execution order is repository → workspace → global-targeted → global-shared. Workspace and shared remove hooks therefore run once per target repository.

A failing `pre-remove` aborts removal before destructive mutation. `post-remove` still runs after removal attempts, including partial failures. Remove dry-run previews discovery but does not spawn hooks or fabricate execution outcomes. Remove dry-run keeps source-aware previews; Configured-create dry-run performs no hook discovery, returns an empty hook ledger, and has no hook preview surface.

## Terminal input contract

Interactive input applies only to eligible human `create` and `remove` invocations. In TTY mode hooks inherit terminal stdin. `--no-hook-input` disables terminal input for that invocation without skipping hooks and is shared by create and remove. `--json` always takes precedence and sets `ARASHI_HOOK_INPUT=disabled`. JSON owns quiet behavior, captures hook streams, and keeps stdout to exactly one JSON document. Disabled and unavailable hooks receive immediate EOF. There is no persistent `hooks.input` configuration.

`--no-hooks` skips execution, while create's unrelated `--interactive` option controls repository selection.

Examples must fail closed on EOF:

```bash
read -r answer || exit 1
case "$answer" in
  y|Y|yes|YES) ;;
  *) exit 1 ;;
esac
```

```powershell
$answer = Read-Host
if ($answer -notin @("y", "Y", "yes", "YES")) { exit 1 }
```

```bat
set "answer="
set /p "answer=Continue setup? [y/N] " || exit /b 1
if /i not "%answer%"=="y" if /i not "%answer%"=="yes" exit /b 1
```

Compose inline steps with the shell's native fail-fast syntax. Never enter secrets through lifecycle-hook prompts; passwords, tokens, signing material, and other secrets also do not belong in snippets. Legacy terminal-input behavior is supported throughout 1.x but non-canonical and may be removed no earlier than 2.0 through a separately approved breaking change.

## Environment contract

All hooks receive `ARASHI_HOOK_NAME`, `ARASHI_HOOK_SCOPE`, `ARASHI_HOOK_EXECUTION_PATH`, `ARASHI_HOOK_WORKSPACE_MODE`, and `ARASHI_MAIN_REPO_PATH`.

- `ARASHI_BRANCH_NAME` is the requested create branch.
- Repository-specific create hooks receive `ARASHI_HOOK_TARGET_REPOSITORY`, `ARASHI_HOOK_TARGET_REPO_PATH`, and `ARASHI_HOOK_TARGET_WORKTREE_PATH`.
- `ARASHI_PARENT_REPO_PATH` is set only for configured repository-specific create hooks.
- `ARASHI_REMOVE_TARGETS_JSON` is the canonical command-wide remove aggregate.
- `ARASHI_HOOK_INPUT` is executor-owned and is always `tty`, `disabled`, or `unavailable`.

Reference variables according to the selected interpreter: `$ARASHI_*`, `$env:ARASHI_*`, or `%ARASHI_*%`. Do not invent undocumented variables.

## Timeout and package-manager boundaries

The default lifecycle-hook timeout is `300000` milliseconds. `hooks.timeout` accepts only integers from `1` through `2147483647`. A timeout is a hook failure and follows the lifecycle's rollback/abort boundary.

Follow the repository's committed `packageManager` and lockfile; do not infer npm from `package.json` alone. For pnpm child setup, avoid recursive workspace execution:

```bash
CI=true corepack pnpm --ignore-workspace install --frozen-lockfile
```

```powershell
$env:CI = "true"
corepack pnpm --ignore-workspace install --frozen-lockfile
```

```bat
set "CI=true"
corepack pnpm --ignore-workspace install --frozen-lockfile
```

Use absolute script paths, keep user-derived values in environment variables/data, and never interpolate them into shell source.
