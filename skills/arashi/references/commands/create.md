# Create worktrees

Create coordinated worktrees only after the effective repository set and base are clear.

Installed `aw <command> --help` is the parameter authority.

## Start a T3 Code task in the exact coordinated workspace

For the user-facing setup and recovery guide, see [T3 Code integration](https://arashi.haphazard.dev/workflows/t3-code/).

Use the native adapter only for configured coordinated workspaces on the repository/T3 host. Confirm `aw create --help` and official `t3 --version`. Compatibility requires **stable official T3 0.0.43 or later, orchestration protocol 1**, matching installed CLI/server versions, and the required authentication/catalog capabilities. Newer stable releases are checked against these interfaces rather than a patch whitelist; reject nightly/prerelease builds or incompatible protocols. Arashi never installs/downloads a component or invokes the former third-party bridge. Ordinary create has no T3 prerequisite.

The official CLI remains necessary for supported headless authentication, even with a desktop-managed server: Arashi uses `t3 auth session issue` / `revoke` to create and revoke its own five-minute bearer session. Do not read private databases or desktop credential/bootstrap stores. Discovery selects `T3CODE_HOME` or `~/.t3`, reading only `userdata/server-runtime.json`. Override the intended profile/executable with `--t3-base-dir /absolute/path` and `--t3-cli /absolute/path/to/t3`. It supports local loopback environments on the repository host, not remote routes or arbitrary dev layouts. Restart stale/unreachable environments and resolve profile ambiguity explicitly; do not scan for alternatives.

Use exactly one nonempty prompt source:

```bash
aw create feature/example --t3 "Implement the accepted task"
aw create feature/example --t3 --prompt-file task.md
aw create feature/example --t3 "Implement the accepted task" --permission approval-required
```

For a task file, assemble self-contained UTF-8 context rather than asking Arashi to infer or scrape conversation history. Include the objective, accepted constraints and decisions, relevant issue/specification/repository context, and completion expectations such as tests, documentation, and reporting. The handoff initiates the new task; it does not complete or monitor it. Never recursively dispatch the same implementation task as an integration smoke; use a bounded acknowledgement task instead.

Choose model preferences through explicit overrides when needed:

```bash
aw create feature/example --t3 --prompt-file task.md \
  --t3-provider codex --t3-model gpt-6.1-sol --t3-effort medium
```

Arashi validates the provider instance, model/aliases, and effort against T3's catalog. A driver name must resolve to exactly one available instance; it is not the routing key. There is no hardcoded model fallback. Pinning the same provider and model, including aliases, retains T3's saved options unless explicitly overridden by effort. Changing provider or model uses catalog defaults for omitted options. Persistent preferences belong under `defaults.t3` in personal `~/.arashi/config.json` or shared workspace `.arashi/config.json`: `provider`, `model`, `effort`, optional absolute `baseDir`, and optional `cli`. Never put credentials there or change persistent preferences unless the user asks. Precedence per field is CLI > workspace > user > T3 project selection > T3 server selection > unambiguous catalog defaults, aligned with user-default configuration ownership.

Migration is explicit: copy chosen bridge provider/model into `defaults.t3.provider` / `model`, and map bridge `thinkingEffort` to `defaults.t3.effort`. Arashi never silently reads bridge config. Verify the selection is supported by the current official catalog. Existing bridge-era receipts remain duplicate protection after migration.

`--permission` accepts only `approval-required`, `auto-accept-edits`, and `full-access`. Omission defaults to `full-access`; Arashi always sets and reports the effective value explicitly. T3 uses the exact created parent checkout as its project root, with null thread worktree path and no worktree bootstrap. UI mode is `none`, so it opens no host UI; desktop reveal and exact-thread navigation are skipped. The original conversation remains attached to main. Report the exact parent path, effective permission and selection, environment/project/thread identifiers, and separate creation, dispatch, and UI outcomes. Tell the user to select the reported thread manually in a desktop or mobile client connected to the same reachable host environment; do not imply phone-local CLI execution or automatic mobile navigation.

An explicit T3 handoff suppresses configured create launch/switch defaults and conflicts with explicit `--switch`, `--launch`, `--tab`, `--tmux`, `--sesh`, or `--herdr`. Missing, conflicting, unreadable, invalid-UTF-8, empty, or whitespace-only prompts and invalid permissions fail before workspace mutation. `--prompt-file`, `--permission`, and all `--t3-*` flags require `--t3`. With `--move-changes`, every attempted move must succeed before dispatch. JSON reports sanitized T3 stages without task text, task-derived titles, credentials, URLs, or raw transport output.

`--dry-run` checks only the installed CLI version and read-only runtime metadata; it issues no session, creates no worktrees, and dispatches no task. Authentication and live catalog validation happen on actual handoff.

If workspace creation succeeds and handoff fails, preserve the exact workspace. For a safe preparation retry, reuse the exact target and same prompt, permission, and selection. Repeat the original overrides; for an original handoff using full access and the selection above:

```bash
aw create feature/example --conflict REUSE_EXISTING --t3 --prompt-file task.md \
  --permission full-access \
  --t3-provider codex --t3-model gpt-6.1-sol --t3-effort medium
```

An existing native receipt retains its saved provider/model/effort selection. Conflicting flags or Arashi user/workspace defaults block retry and require reconciliation; repeat the original overrides to preserve intent. T3 default changes do not replace the saved selection. A successful, active, or indeterminate receipt blocks blind duplication. Native retries reconcile saved project/thread identifiers; an uncertain task can only be confirmed by its saved message identifier, never resubmitted. A stale lock must be reconciled after its owning process stops; remove only that exact lock to allow reconciliation. Bridge-era receipts require manual reconciliation. Only when the original task was never accepted should you remove only the exact reported receipt and its stale `.lock` peer before a fresh handoff. Receipt-storage or auth/lock cleanup failure retains known remote success; never repeat a successful task. Arashi's unreclaimed sessions expire in five minutes.

Current evidence is macOS arm64 end-to-end with T3 0.0.43 and protocol 1. Transport/auth/discovery, native recovery, bridge-era receipts, and Windows ACL branches have automated coverage, but do not claim Windows, Linux, or mobile end-to-end validation without running it.

## Configuring Worktree Naming

For configured workspaces, edit `.arashi/config.json` directly; `aw configure` does not expose worktree naming. Add `worktreeNaming` as a root object, not beneath `defaults`, `meta`, or a repository entry:

```json
{
  "worktreeNaming": {
    "style": "repo-branch",
    "branchSlashes": "flatten",
    "maxPathLength": 180
  }
}
```

For standalone personal naming, use the separate optional `~/.arashi/config.json` file. It requires a root `"version": "1.0.0"` alongside the root `worktreeNaming` object shown above; the workspace fragment alone is not a valid user file. These personal defaults also apply in configured mode, but explicit repo configuration takes priority. Ordinary `aw init` is not required for personal defaults.

The fields use closed vocabularies:

- `style` accepts exactly `default`, `branch`, and `repo-branch`.
- `branchSlashes` accepts exactly `preserve` and `flatten`.

Omitting the `worktreeNaming` object or either individual field applies `default` and `preserve` without migrating and without persisting either default. Given a repository named `example` and branch `feature/auth`, the directory path is:

| Repository | `style` | `branchSlashes` | Directory path |
| --- | --- | --- | --- |
| bare | `default` | `preserve` | `example/feature/auth` |
| bare | `default` | `flatten` | `example/feature-auth` |
| bare | `branch` | `preserve` | `feature/auth` |
| bare | `branch` | `flatten` | `feature-auth` |
| bare | `repo-branch` | `preserve` | `example-feature/auth` |
| bare | `repo-branch` | `flatten` | `example-feature-auth` |
| non-bare | `default` | `preserve` | `feature/auth` |
| non-bare | `default` | `flatten` | `feature-auth` |
| non-bare | `branch` | `preserve` | `feature/auth` |
| non-bare | `branch` | `flatten` | `feature-auth` |
| non-bare | `repo-branch` | `preserve` | `example-feature/auth` |
| non-bare | `repo-branch` | `flatten` | `example-feature-auth` |

`maxPathLength` is optional and accepts a positive integer budget for the full absolute newly planned configured-worktree destination, measured in UTF-16 code units. Omitting `maxPathLength` preserves current paths and does not persist or migrate a default; Arashi does not select an automatic or platform default.

If a configured destination would exceed the budget, Arashi shortens only the ordinary generated parent-relative namespace after normalizing it to a portable `/`-separated namespace. The fitted name uses a readable prefix, `-`, and the first eight lowercase SHA-256 hex characters over the portable ordinary namespace. One authoritative parent is sized against all selected coordinated child paths, with child-relative paths unchanged. `WORKTREE_PATH_LENGTH_EXCEEDED` is reported before any mutation when fixed topology cannot fit the collision-resistant suffix.

The Git branch remains the exact requested name; only the directory path is transformed. A path collision fails without generating an alternate suffix. Existing worktrees are never renamed, existing registrations remain at their exact paths, and recorded metadata remains authoritative for locating them. Coordinated child placement remains unchanged. Standalone create uses optional user `worktreeNaming` under the effective worktree root. Without user overrides, its default remains `.worktrees/<branch>`. Standalone `maxPathLength` measures the full absolute destination in UTF-16 code units and rejects over-budget paths before mutation; it does not shorten names. This reserves worktree-root path space but cannot guarantee repository-internal files fit.

## Repository Worktree File Materialization

Configured mode accepts direct `repos.<name>.copy` and `repos.<name>.symlink` arrays. Each declared repository-relative path uses the same relative path in the canonical Git primary source checkout and the new worktree destination. This configuration is configured-only and is not available in zero-config standalone mode.

For each repository, Arashi runs repository pre-create, then every copy entry in declaration order, then every symlink entry in declaration order, and then repository post-create. `--no-hooks` disables hooks only and does not disable declarative materialization.

A missing source is skipped visibly. Destinations never overwrite an existing object and never escape the new worktree. A symlink is a native symbolic link to the exact canonical source target; platform or policy capability failures are actionable and never fall back to a copy, hard link, or junction.

`aw create --dry-run` previews the ordered materialization plan in declaration order without mutation. `aw doctor` non-mutatively diagnoses configured source availability and managed destination safety without repair and without capability probes.

Use `copy` for `.env` or local configuration that must be independently mutable in each worktree; the supported same-path case does not require a shell hook. Use `symlink` only for intentionally shared state, because mutation is shared with the canonical checkout and native symbolic-link capability varies by platform.

For normal dependency setup, prefer package-manager content-addressed stores plus per-worktree installs. Treat symlinked `node_modules` or equivalent shared dependency trees as advanced and risky: branches, lockfiles, runtimes, native modules, and install scripts can diverge or mutate shared state.

Use lifecycle hooks when you need globs, remapping, external sources, interpolation, required entries, or conditional behavior. Do not invent unsupported materialization fields. See [Hooks](../hooks.md) for the custom-setup escape hatch.

## Create from a Coordinated Base Branch

Configured workspaces use one shared repository base policy for `create`, `clone`, `status`, `pull`, no-upstream `push` comparison, `handoff`, and `doctor`. Put the workspace policy at root `baseBranch`; use `meta.baseBranch` only for the meta repository and `repos.<name>.baseBranch` only for a child that differs:

```json
{
  "baseBranch": "main",
  "meta": { "baseBranch": "meta/integration" },
  "repos": {
    "api": {
      "path": "repos/api",
      "gitUrl": "git@github.com:example/api.git",
      "baseBranch": "api/integration"
    }
  }
}
```

Do not duplicate branch ancestry under create and clone defaults. `defaults.create` continues to own launch and switch behavior, not canonical base policy.

For a one-off invocation-wide override, use `aw create <target> --base <branch>` or `aw clone --base <branch>`. Add the repeatable repository-specific `--repo-base <repository=branch>` option for exceptions. `@meta` selects the meta repository for configured create; clone accepts only exact configured child names:

```bash
aw create feature/release --base release \
  --repo-base @meta=meta/release \
  --repo-base api=api/release

aw clone --all --base release --repo-base api=api/release
```

For create and clone, precedence is repository CLI > invocation CLI > repository config > workspace config. Status, pull, push fallback, handoff, and doctor apply repository config then root policy. Policy source terms remain `repository-cli`, `cli`, `repository-config`, `workspace-config`, and `legacy-omitted`. A repository override changes only its matching selected repository.

Arashi validates malformed, duplicate, unknown, and unselected selectors and invalid branch names across the complete effective selected set before hooks, managed-ignore reconciliation, Git refs, or filesystem mutation. `@meta` is rejected for clone. `--only`, `--group`, and interactive selection determine the effective set before this preflight; an override for an unselected repository is an error rather than an ignored hint.

When a policy applies, create resolves each selected repository independently using its local branch first and then `origin/<branch>`, after removing at most one leading `origin/`. Resolution does not fetch other remotes. New targets start at the captured resolved OID, so a later ref move does not change the plan.

An existing target remains authoritative. Create and coordinated clone reuse it unchanged. Arashi does not reset, rebase, rewrite, or ancestry-check it against the effective base. For a missing child in a coordinated worktree, clone uses the effective base only as the missing coordinated target's creation point and leaves the child checked out on the coordinated target branch, never on the base branch. See [Repository Cloning and Recovery](workspace.md#repository-cloning-and-recovery).

`defaults.create.baseBranch` is unsupported. Move a workspace-wide value to root `baseBranch`, or use `meta.baseBranch` / `repos.<name>.baseBranch` for a repository-specific value. Arashi rejects the removed property even when canonical policy is also present, before repository or hook discovery and before network, Git, ignore, or filesystem mutation. `defaults.create.launch` and `defaults.create.switch` remain supported.

In implicit standalone mode, `--base` is invocation-only for create. Standalone create ignores configured root/meta/child policy, rejects `--repo-base`, and does not add standalone clone support. Omitting `--base` preserves the existing current-`HEAD` start point and creates no `.arashi` configuration.

Human `--dry-run` output reports every selected repository without mutation. In structured create success output, `data.base.repositories` is the complete effective selected set in selection order: `repositoryIdentity` is the canonical selector identity (`@meta` for the meta repository), `repositoryName` is the repository display name, and `repositoryPath` is its canonical absolute path. For records with an effective requested base, `requestedBranch` is normalized and the record includes its policy source, immutable `resolvedRef` and `resolvedOid`, and `targetAction` is exactly `created` or `reused`; legacy-omitted records do not claim a resolved ref or OID. The enclosing `data.base` also carries `requestedBranch` and `source` when available for compatibility.

Selector validation failures use code `BASE_BRANCH_POLICY_INVALID` and list every issue under `error.details.issues` with its stable issue code, offending value, and message. Create resolution failures use code `CREATE_BASE_RESOLUTION_FAILED`; `error.details.repositories` contains only affected repositories in effective selection order, with `repositoryIdentity` as the canonical selector identity, `repositoryName` as the repository display name, their normalized `requestedBranch`, exact source, canonical path, and `attemptedRefs` in the exact order `refs/heads/<branch>` then `refs/remotes/origin/<branch>`. When an effective base policy applies, clone success reports each selected child's effective identity, name, requested branch, and source under `data.base`; clone preflight failures use `CLONE_BASE_PREFLIGHT_FAILED` and `error.details.repositories` with the affected child's requested branch, source, `gitUrl`, and failure reason.

With `--json` (including create `--dry-run --json` and clone `--all --json`), stdout remains exactly one JSON envelope. Stable sources are `repository-cli`, `cli`, `repository-config`, `workspace-config`, and `legacy-omitted`. Automation should use the JSON envelope, exit status, and stderr rather than parse human output. `ARASHI_BRANCH_NAME` remains the target-branch hook context; do not invent `ARASHI_BASE_BRANCH`.

Use command defaults in `.arashi/config.json` to control post-create behavior and select one canonical switch mode:

```json
{
  "defaults": {
    "create": {
      "switch": true,
      "launch": "herdr"
    },
    "editors": {
      "vscode": {
        "create": {
          "switch": false,
          "launch": "auto"
        }
      }
    },
    "switch": {
      "mode": "auto"
    }
  }
}
```

For `defaults.create.launch`, choose `none`, `auto`, `sesh`, or `herdr`. Omitting it has the built-in `none` behavior. The independent `switch` boolean still opts into or out of post-create selection, but launch implies switch: resolving `auto`, `sesh`, or `herdr` always selects the newly created primary worktree even when `switch` is false or `--no-switch` is present. Conversely, `launch: "none"` does not suppress an independently enabled switch.

Scope create defaults to the invocation host. Terminal invocations use only `defaults.create`. Editor-hosted invocations use only `defaults.editors.<host>.create` for the matching `vscode`, `cursor`, or `kiro` host and do not fall back to generic defaults or another editor host when that scope is absent. Explicit in-repo configuration takes priority; the separate optional user configuration fills unset fields. Implicit standalone create can use those optional user defaults with the same host selection, without creating an in-repo configuration file.
Use one-off CLI overrides when one `aw create` run should differ from its matching configured scope:

```bash
aw create feature-auth --launch
aw create feature-auth --tmux
aw create feature-auth --sesh
aw create feature-auth --herdr
aw create feature-auth --tab
aw create feature-auth --no-launch
aw create feature-auth --no-switch
aw create feature-auth --move-changes
```

Create launch precedence is `--sesh` or `--herdr` > `--launch` > `--no-launch` > matching configured `launch` > built-in `none`. An explicit launcher implies launch even with `--no-launch`; simultaneous `--sesh` and `--herdr` is rejected before repository discovery or mutation. `--no-launch` suppresses a configured launcher when no explicit launcher is present. Switch precedence is resolved independently before launch-implies-switch is applied.

Configured launch is unsupported with `create --json`: resolved `auto`, `sesh`, or `herdr` returns one structured unsupported-mode error before repository discovery or worktree mutation, just like explicit launch flags. Resolved `none` may continue through normal non-interactive JSON create, with stdout remaining exactly one JSON document.

Automatic launch uses tmux → Herdr → cmux → integrated IDE → Kitty → terminal/platform selection and strict environment checks. Explicit `sesh` or `herdr` bypasses automatic context detection. Launch runs only after successful creation; launcher validation or process failure preserves every successfully created worktree, reports creation separately from launch failure, and does not fall back to another launcher. Paths and labels remain distinct process arguments rather than shell-interpolated command text.

If work starts before the right coordinated worktree exists, move compatible uncommitted edits into the target workspace:

```bash
# after creating the target worktree
aw move --to feature-auth

# explicit source and target for unattended automation
aw move --from main --to feature-auth --json
```

Expected outcomes:

- `aw create <branch>` leaves existing uncommitted changes in place and prints move guidance when compatible changed repositories are detected.
- `aw create <branch> --json` includes dirty-workspace guidance as structured data, not human text.
- `aw create <branch> --move-changes` moves compatible staged, unstaged, and untracked changes after successful worktree creation.
- `aw move` refuses dirty target repositories and reports recovery commands if a stash-backed transfer needs manual recovery.
Precedence for create/switch launch behavior is: explicit flag > opt-out flag > config default > built-in default. `--tmux` is a per-invocation-only override: configured `auto` remains the persistent contextual path to plain tmux. In zero-config standalone and configured repositories alike, explicit tmux requires a non-empty trimmed `TMUX` and does not fall back after prerequisite or process failure.

For switch, `--tmux` conflicts with `--cd` and any explicit launcher in `--sesh`, `--herdr`, `--vscode`, `--cursor`, or `--kiro`. `--tmux --launch` is compatible launch intent, and `--tmux --ignore-configured-launcher` keeps explicit tmux authoritative while bypassing configured launchers. For create, `--tmux` implies launch and target selection: `--tmux --no-launch` and `--tmux --no-switch` still create and launch the primary worktree, while create `--tmux` conflicts with `--sesh` or `--herdr`.

Both `switch --json --tmux` and `create --json --tmux` return one structured `JSON_UNSUPPORTED_FOR_MODE` document before context validation, conflicts, launch, hooks, or repository mutation. Switch retains its `launch` mode label; create retains its `interactive-or-launch` mode label. A missing tmux context therefore creates nothing. A `tmux new-window` process failure after successful create preserves successfully created worktrees and does not try another launcher.

The configured vocabularies do not gain `tmux`: `defaults.switch.mode` still accepts only `auto`, `cd`, `launch`, `sesh`, and `herdr`, while `defaults.create.launch` still accepts only `none`, `auto`, `sesh`, and `herdr`. Configured `auto` can continue choosing plain tmux contextually.
