# Workspace and repositories

Configure managed paths and repositories. Choose ignore scope deliberately and never modify global Git ignore configuration.

Installed `aw <command> --help` is the parameter authority.

## Workspace Initialization

Prefer configured mode whenever a project can adopt Arashi, including a single repository that needs repository/workspace hooks, persisted defaults, or custom paths. Choose initialization by workspace mode:

- Use ordinary `aw init` for configured child repositories, groups, hooks, defaults, custom managed paths, or coordinated commands.
- Use `aw init --zero-config` for ad hoc work in an existing non-bare Git project that has not adopted Arashi, using the fixed root-level `.worktrees/<branch>` layout.

Preview or automate standalone bootstrap without changing its local-only policy:

```bash
aw init --zero-config --dry-run
aw init --zero-config --json
aw init --zero-config --dry-run --json
```

Zero-config init accepts its mode flag plus `--dry-run`, `--verbose`, and `--json`; do not combine it with configured-init options such as `--repos-dir`, `--worktrees-dir`, `--ignore-scope`, `--force`, or `--no-discover`. It creates no `.arashi/config.json`, does not edit tracked `.gitignore`, and does not create or modify global Git configuration. If no effective rule already covers the deterministic probe, it adds only the literal `.worktrees/` rule to the repository-local exclude file resolved by Git. Dry-run plans the same directory and rule actions without writes; JSON mode emits one structured envelope.

Passive standalone discovery requires an existing main-root `.worktrees/` directory and never repairs missing ignore coverage. `create`, including `create --dry-run`, checks the exact planned destination before mutation. A branch named `feature/auth` therefore requires `.worktrees/feature/auth` to be effectively ignored and is created at that exact path. To independently check the same gate from the main root, run `branch=feature/auth`, `destination=".worktrees/$branch"`, then `git check-ignore --no-index -q -- "$destination"` and require exit status `0` before creating.

Supported standalone lifecycle commands are `create`, `list`, `status`, `switch`, `remove`, `prune`, `doctor`, `move`, and `handoff`. Invoking them from the main worktree or a linked worktree resolves the same sole main repository. Repository or group filters on these commands, including `create --only`, `create --group`, `status --group`, interactive multi-repository selection, and `switch --repos` or `switch --all`, have no standalone meaning and fail clearly.

The child-coordination commands `add`, `clone`, `sync`, `pull`, `push`, `exec`, and `setup` are configured-only. Run ordinary `aw init` to upgrade before using them; do not interpret an empty repository map as a successful no-op.

For configured mode, run `aw init` from an existing repository root, or from a non-repository parent directory when you want Arashi to create the repository during setup.

When an existing repository is bare, run init from the bare repository or a Git-discoverable descendant. Arashi canonicalizes the workspace to the absolute bare repository directory before it reads or writes configuration.

Initialize an existing repository with defaults:

```bash
aw init
```

Bootstrap the current directory as a new repository:

```bash
mkdir my-arashi-workspace
cd my-arashi-workspace
aw init
# prompt: Repository target ('.' for current directory or a child directory name) -> .
```

Bootstrap a child repository from a parent directory:

```bash
mkdir scratch
cd scratch
aw init
# prompt: Repository target ('.' for current directory or a child directory name) -> my-arashi-repo
cd my-arashi-repo
```

Use a custom repositories directory:

```bash
aw init --repos-dir ./workspace-repos
```

Use a custom worktree base directory:

```bash
aw init --worktrees-dir ./workspace-worktrees
```

An explicit `--worktrees-dir` wins over the repository-aware omitted default in either repository type and is normalized before persistence.

Choose an explicit clone-local ignore preference only when the repository-local default is not appropriate:

```bash
# write missing managed-directory rules to the workspace-root .gitignore
aw init --ignore-scope tracked

# do not write ignore files; report unignored managed paths instead
aw init --ignore-scope none

# restore the repository-local default in an existing configured workspace
aw init --ignore-scope local
```

Expected outcomes:

- `.arashi/config.json` includes `reposDir` and `worktreesDir`.
- when `--worktrees-dir` is omitted, a canonical bare repository defaults to `..`, while a non-bare repository defaults to `.arashi/worktrees`.
- an existing configured value remains authoritative for later commands and preference-only init; Arashi uses `.arashi/worktrees` only as the compatibility fallback for a legacy config that omits the field. Forced reinitialization recalculates the omitted default from repository type.
- bootstrap mode accepts only `.` or a direct child directory name.
- in non-bare repositories, safe configured repository and worktree directories are checked against Git's effective tracked, repository-local, and global ignore sources before any write.
- with no explicit or stored preference, missing rules are added to the repository-local exclude file resolved by Git; tracked `.gitignore` is unchanged.
- `tracked` and `none` are stored in clone-local Git state, not shared `.arashi/config.json`; selecting `local` clears the non-default preference.
- `aw init --ignore-scope local` can reset only the preference and reconcile an existing valid workspace without `--force` or reinitializing configuration, hooks, or repositories.
- existing effective rules are honored without duplication even when their source differs from the selected scope.
- repository root, absolute paths, and parent traversal are reported as unsafe and are never added automatically.
- Arashi never creates or modifies global Git configuration or a global excludes file.

## Managed Ignore Reconciliation

In non-bare repositories, configured initialization and configuration-backed lifecycle commands reconcile the safe normalized `reposDir` and `worktreesDir` rules before they materialize or continue work that depends on those paths. This applies to `init`, `pull`, `clone`, `add`, and `create`. A fresh clone with no stored preference defaults to the repository-local Git exclude file and does not unexpectedly dirty tracked `.gitignore`.

Configured init at a canonical bare repository uses non-worktree managed-path reporting instead: the `..` parent default is external and unsafe, and administrative subdirectories beneath the bare root are non-applicable to working-tree ignore rules. For `local`, `tracked`, and `none`, bare init reports the selected scope and these classifications but does not run `git check-ignore`, create a temporary worktree, or write `.gitignore` or the common local exclude file. An explicit non-default `tracked` or `none` selection may preserve its clone-local scope preference, but that preference does not authorize an ignore-file write. This policy is unchanged by linked worktrees and works for committed or unborn bare repositories.

Command boundaries:

- `init` reconciles before creating managed directories and is the command that selects `local`, `tracked`, or `none` with `--ignore-scope`.
- `pull` uses the current configuration, and when the selected parent pull changes configuration, reloads it and reconciles the resulting paths before continuing with the re-evaluated child selection. It does not pull an excluded parent solely for reconciliation or implicitly clone a newly configured missing child.
- `clone` reconciles before creating a configured repository path.
- `add` reconciles before changing configuration and cloning into `reposDir`.
- `create` reconciles before creating parent or child worktrees.

Expected outcomes:

- Git's existing effective tracked, repository-local, or global rule wins; Arashi does not add a duplicate rule or rewrite user-authored content.
- In non-bare repositories, `local` writes only Arashi-owned rules to the common repository's local exclude file; `tracked` writes only Arashi-owned rules to workspace-root `.gitignore`.
- `none` leaves ignore files untouched and warns about safe paths that remain unignored.
- Bare repositories are the exception: every scope uses the non-worktree reporting policy above and performs no ignore-file writes.
- repeated lifecycle commands are idempotent, and command rollback reports whether reconciliation was attempted, retained, restored, or could not be restored based on final filesystem state.
- human output explains warnings; JSON-capable modes keep stdout to one JSON document and place details under the command's managed-ignore result.
- after configured initialization, lifecycle commands use `.arashi/config.json`; `init` itself reconciles before writing that file. Zero-config standalone bootstrap is a separate local-only path described above.

Run `aw doctor --json` to inspect missing rules, stale Arashi-owned entries, invalid stored scope, or unsafe configured paths without mutation. Follow its suggested repair; use `aw init --ignore-scope local` to restore the default when that is the intended preference. Do not repair Arashi by setting `core.excludesFile` or editing any global Git configuration.

## SSH Remote Aliases for Add and Clone

Configured workspaces accept Git's explicit-user SCP form, omitted-user SCP form, and `ssh://` form. For example:

```bash
aw add git@work-github:acme/api.git
aw add work-github:acme/api.git
aw add ssh://git@work-github/acme/api.git
aw add ssh://work-github/acme/api.git
```

The host token is opaque: Git/OpenSSH owns host resolution and authentication. Arashi does not read, manage, or resolve SSH configuration, does not run an independent SSH connectivity probe, and does not synchronize aliases, keys, identities, or routing. It passes the remote to Git and reports Git's failure in the normal command result.

`add` trims outer whitespace once, then uses that same normalized remote for Git, result output, and persisted configuration. `clone` treats configured remotes as authoritative. If HTTPS is inferred or selected, Arashi preserves every configured SSH URL byte-for-byte and never automatically rewrites an SSH remote to HTTPS; a mixed clone run can therefore remain mixed. HTTPS-to-SSH conversion remains supported for an HTTPS source because that source supplies an explicit network host and path.

An unresolved or unauthenticated alias follows the existing command safety behavior. Failed `add` uses the normal add rollback boundary for configuration, clone, setup, and managed-ignore state. During a multi-repository `clone` with no effective base policy, one Git failure is recorded for that repository; clone continues with the remaining repositories and reports partial success through the existing human or JSON envelope. When a base policy applies, all selected remotes and effective bases preflight together, and one failure prevents every selected clone before mutation.

SSH aliases are machine-local, so every machine using a stored alias needs compatible OpenSSH routing. For shared configuration, prefer a canonical committed remote and use a machine-global Git `url.<base>.insteadOf` rule in `~/.gitconfig`, not repository-local `.git/config`, when a developer needs identity-specific routing:

```bash
git config --global url."git@work-github:".insteadOf git@github.com:
```

The command writes the equivalent global Git configuration:

```gitconfig
[url "git@work-github:"]
    insteadOf = git@github.com:
```

The committed Arashi remote can remain `git@github.com:acme/api.git`, while Git rewrites it locally for that developer. Arashi does not install or synchronize that rewrite.

## Optional Repository Onboarding During Add

Run `aw add <remote>`. Optional onboarding is eligible only when stdin and stdout are TTYs and neither `--json` nor `--force` is active. The first onboarding prompt defaults to no and a decline continues with the minimal repository entry. Non-TTY, `--json`, and `--force` invocations stay on that minimal path without discovery or onboarding prompts. Onboarding configures only the repository being added, never workspace hooks or unsupported fields.

Every optional section starts unselected: `copy`, `symlink`, `pre-create`, `post-create`, `pre-remove`, and `post-remove`. Copy and symlink discovery is a bounded, root-only metadata scan whose suggestions remain unselected path names; never read, inspect, or disclose their contents. Manual entries remain available, pass canonical path validation, and receive the dependency-sharing warning when applicable. Follow [Repository Worktree File Materialization](create.md#repository-worktree-file-materialization) for copy-versus-symlink behavior and safety.

For hooks, choose exactly one source per selected lifecycle: a user-supplied inline command or an editable active native script. Inline commands are always user supplied in Bash shorthand or canonical `bash`, `powershell`, and `cmd` interpreter shapes. Follow the [Lifecycle Hooks reference](../hooks.md) for canonical repository ownership and runtime behavior.

A create script is installed under the active configuration root at `.arashi/hooks/<pre|post-create>.<repo><ext>`. A remove script path is beneath the runtime-resolved target repository from that same active root plus `repos.<name>.path`, at `.arashi/hooks/<pre|post-remove><ext>`; in linked-parent mode this is the linked active child worktree, not the canonical clone. POSIX creates only `.sh` at mode `0755`, while Windows deterministically creates one `.ps1`. Generated scripts are safe, silent successful no-op scaffolds, not `.example` files, and need no rename, `chmod`, or activation step. They are immediately runtime-ready and never overwrite an existing path.

Installation privately prepares each complete scaffold, then uses atomic no-replace publication at the active path. It rejects observable symlink traversal and unsafe parents, and validates parent identities before and after publication. This is the strongest practical pure Node/Bun safety, not absolute race freedom: a hostile local process with workspace write access can still substitute an ancestor between validation and publication.

Treat hook source as sensitive: never print, repeat, preview, diagnose, or report inline or generated-script bodies. Add shows one sanitized final summary and confirmation, then performs at most one configuration save. Its transaction owns script installation, and rollback removes only unchanged scripts created by that invocation. The initial default-no decline continues minimal add, but final-confirmation decline or Ctrl+C after opting in is cancellation and performs no config save.

Do not use `aw add` to edit an existing entry. First inspect the installed `aw --help`. If it lists `configure`, follow the installed `aw configure --help`. Otherwise, directly edit and validate `.arashi/config.json` using the installed schema and the focused materialization and hook references above. See the [canonical configuration workflow](https://arashi.haphazard.dev/workflows/config/).

## Adding a Repository from a Linked Parent Worktree

A direct add from the canonical parent checkout keeps the existing one-clone flow: Arashi clones beneath that checkout's configured `reposDir` and updates that checkout's `.arashi/config.json`.

From a linked parent worktree, Arashi clones the child beneath the canonical parent checkout's configured `reposDir`, leaves that canonical clone on the detected child default branch, and creates the active child path as a linked worktree on the active parent branch. Only the active parent worktree's `.arashi/config.json` receives the new repository entry; linked add does not edit the canonical parent checkout's tracked configuration. Do not manually create a second clone.

If a matching `origin/<active-parent-branch>` remote-tracking ref exists, the coordinated local branch tracks that ref; otherwise Arashi creates it from the detected child default branch. The canonical clone remains on the child default branch while the active child worktree checks out the coordinated branch.

Before materialization, linked add evaluates effective ignore coverage for both canonical and active destinations. With `local` scope, the common repository exclude authority must cover both destinations; with `tracked` scope, the canonical destination must already be ignored from the canonical checkout before Arashi may reconcile the active branch's `.gitignore`; with `none`, Arashi writes no ignore files, reports each unignored destination, and may continue under the explicit opt-out policy. Linked add never edits the canonical checkout's tracked `.gitignore`; if tracked scope does not already protect the canonical destination, reconcile and commit that rule on the branch checked out in the canonical parent checkout before retrying. A managed-ignore-unsafe `reposDir`, including an absolute path or repository-root value such as `.`, retains single-placement behavior in the active workspace rather than attempting two coordinated materializations.

Materialization and config persistence are one rollback boundary. If linked-worktree cleanup or final-state observation is incomplete, rollback retains the canonical clone, coordinated branch, and applicable managed-ignore coverage because the surviving linked child depends on the canonical clone's Git common directory. Human and JSON results distinguish the config-relative repository path, canonical clone/default branch, and active worktree/coordinated branch; `--json` remains one document without human progress on stdout.

## Repository Cloning and Recovery

Before choosing lower-level recovery commands, use `aw doctor --json` for structured, non-mutating workspace health diagnostics. Follow the reported finding codes, severities, and suggested commands to decide whether to run `status`, `clone`, `prune`, or repository-specific Git commands next.

Use `aw clone` to clone configured repositories that are missing locally.

```bash
# interactively choose missing repositories
aw clone

# clone all missing repositories
aw clone --all
```

Configured clone shares the repository base policy with configured create. Root `baseBranch` is the fallback; `repos.<name>.baseBranch` overrides it for one child. A one-off `--base <branch>` overrides configuration for every selected missing child, while repeatable `--repo-base <repository=branch>` entries override only their exact configured child:

```bash
aw clone --all --base release --repo-base api=api/release
```

Clone precedence is repository CLI > invocation CLI > repository config > workspace config > legacy omitted behavior. The removed `defaults.create.baseBranch` property is unsupported for the workspace as a whole and must be migrated before clone or any other configured command runs. `@meta` is invalid for clone because clone selects configured children only. Malformed, duplicate, unknown, and unselected selectors and unavailable effective bases are aggregated across the selected missing set before managed-ignore reconciliation or destination creation.

From the main configured workspace, a child with an effective base is cloned at that branch and tracks `origin/<base>`. With no effective policy, clone preserves remote-default behavior. Inside a coordinated worktree, the active coordinated target branch remains the checkout: the effective base is only the creation point when that target is missing. If the target already exists, clone reuses it unchanged; it does not reset, rebase, rewrite, or ancestry-check the target against the base.

The removed `defaults.create.baseBranch` property is unsupported. Move a workspace-wide value to root `baseBranch`, or use `meta.baseBranch` / `repos.<name>.baseBranch` for a repository-specific value. Clone is configured-only; implicit standalone mode supports no clone policy or repository-specific override.

The older per-repository partial-success behavior applies only to a multi-repository clone with no effective base policy: a Git failure may be recorded while unaffected repositories continue. When a base policy applies, selector, remote, and base checks aggregate across the complete selected missing set, and any preflight failure blocks every selected clone before mutation.

For `aw clone --all --json`, stdout is one envelope. When an effective base policy applies, successful policy evidence appears under `data.base` as ordered records containing each selected child's `repositoryIdentity`, `repositoryName`, normalized `requestedBranch`, and stable source; when every selected child uses legacy-omitted behavior, `data.base` is absent. Selector failures use `BASE_BRANCH_POLICY_INVALID` with all issues under `error.details.issues`; unavailable remote/base preflight uses `CLONE_BASE_PREFLIGHT_FAILED` with every affected child under `error.details.repositories`, including its requested branch, source, `gitUrl`, and reason. Use the envelope, exit status, and stderr rather than parse human output.

Expected outcomes:

- command exits `0` when selected clone operations succeed
- selected base/remote checks finish before managed-ignore or filesystem mutation
- a main-workspace clone with policy checks out the effective base; omitted policy keeps the remote default
- a coordinated clone checks out the coordinated target, using the effective base only to seed a missing target
- an existing coordinated target is reused without rewrite or ancestry claims
- already-present repositories are skipped
- `--json` remains one document with per-repository effective base/source or structured aggregated failures
- `aw status` no longer reports missing repository spawn errors
