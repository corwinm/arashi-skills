# Create worktrees

Create coordinated worktrees only after the effective repository set and base are clear.

Installed `aw <command> --help` is the parameter authority.

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

The Git branch remains the exact requested name; only the directory path is transformed. A path collision fails without generating an alternate suffix. Existing worktrees are never renamed, existing registrations remain at their exact paths, and recorded metadata remains authoritative for locating them. Coordinated child placement remains unchanged. Standalone `.worktrees/<branch>` placement remains unchanged. This reserves worktree-root path space but cannot guarantee repository-internal files fit.

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

Scope create defaults to the invocation host. Terminal invocations use only `defaults.create`. Editor-hosted invocations use only `defaults.editors.<host>.create` for the matching `vscode`, `cursor`, or `kiro` host and do not fall back to generic defaults or another editor host when that scope is absent. Implicit standalone create has no configured defaults and continues to use explicit flags only.
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
