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

## Inspecting and Editing Workspace Configuration

Use `aw configure` in an existing configured workspace to inspect supported settings and make human-confirmed interactive edits; it is an explicit product-owned editor, not a generic JSON Schema-generated editor.

The supported scope families and fields are:

- workspace settings: `reposDir`, `worktreesDir`, `baseBranch`, and `sync.timeoutSeconds`;
- workspace lifecycle hooks: `hooks.timeout`, `hooks.scripts.pre-create`, `hooks.scripts.post-create`, `hooks.scripts.pre-remove`, and `hooks.scripts.post-remove`;
- command defaults: `defaults.create.switch`, `defaults.create.launch`, and `defaults.switch.mode`;
- editor defaults: `defaults.editors.vscode.create.switch`, `defaults.editors.vscode.create.launch`, `defaults.editors.cursor.create.switch`, `defaults.editors.cursor.create.launch`, `defaults.editors.kiro.create.switch`, and `defaults.editors.kiro.create.launch`;
- meta-repository policy: `meta.baseBranch`;
- one existing repository: `repos.<name>.groups`, `repos.<name>.baseBranch`, `repos.<name>.copy`, `repos.<name>.symlink`, `repos.<name>.hooks.pre-create`, `repos.<name>.hooks.post-create`, `repos.<name>.hooks.pre-remove`, and `repos.<name>.hooks.post-remove`; `repos.<name>.path` and `repos.<name>.gitUrl` are identity-only context and are noneditable.

Inspection labels a canonical persisted field `Configured` when present and `Not configured` when absent, while a separately labeled effective value can be inherited or built-in and never persists merely because it was inspected. `Not configured` does not mean invalid or ineffective, and runtime diagnosis remains the responsibility of `aw doctor`.

For each selected editable field, keep preserves the persisted field exactly through canonical serialization, edit sets or replaces it using the accepted shape, and clear removes only the selected optional field and empty owning containers. Required `reposDir` supports keep. It supports edit. Clear is forbidden. Empty input is not a substitute for an explicit action.

A pre-existing active native file is external active state. Configure never offers clear. It never deletes the file. It never overwrites the file. It offers keep/skip instead. Workspace active files use the exact canonical paths `<workspace>/.arashi/hooks/pre-create<ext>`, `<workspace>/.arashi/hooks/post-create<ext>`, `<workspace>/.arashi/hooks/pre-remove<ext>`, and `<workspace>/.arashi/hooks/post-remove<ext>`; repository create files use `<workspace>/.arashi/hooks/pre-create.<repo><ext>` and `<workspace>/.arashi/hooks/post-create.<repo><ext>`, while repository remove files use `<configurationRoot>/.arashi/hooks/pre-remove.<repo><ext>` and `<configurationRoot>/.arashi/hooks/post-remove.<repo><ext>`.

For repository remove files, the canonical active path is `<configurationRoot>/.arashi/hooks/<lifecycle>.<repo><ext>`; add and configure create or install that canonical qualified file for a substantial script. A compatible child-local `<activeRepo>/.arashi/hooks/<lifecycle><ext>` is external active state and blocks duplicate creation or installation rather than being overwritten, adopted, or composed.

Before any mutation, the final confirmation shows the exact serialized candidate JSON, including plaintext inline command bodies, and a separate active-file plan listing lifecycle, exact path, safe no-op state, and runtime-ready permissions; it does not put generated file contents into the JSON preview. Declining the final preview leaves configuration bytes and active files unchanged. Interrupting the final preview leaves configuration bytes and active files unchanged. Cancellation output does not repeat inline command bodies.

When canonical serialization equals the original snapshot and there is no active-file plan, configure reports no changes before final mutation confirmation or persistence and does not install files. Keep and skip therefore preserve unchanged bytes instead of causing a canonical rewrite.

Both human and `--json` modes require a canonically configured valid workspace: missing `.arashi/config.json`, standalone context, and invalid configuration fail before any prompt or inspection, and configure never initializes or repairs configuration. Interactive editing additionally requires both stdin and stdout to be TTYs; a non-TTY invocation without `--json` fails before prompting or mutation.

`aw configure --json` emits exactly one stable sanitized inspection document. It never prompts. It never mutates. For hook-source details, ordinary views, JSON inspection, and cancellation output expose only lifecycle and interpreter presence and omit inline command bodies and active-file contents; only visible inline entry and the final exact JSON preview show persisted command text. The command does not provide `--set` or `--unset` mutation flags.

For unsupported canonical fields, edit `.arashi/config.json` directly and validate the resulting workspace with `aw doctor --json`. Preserve fields outside the supported configure scopes; do not assume that `aw configure` exposes every schema field or repairs unrelated configuration.

## Deleting Configured Repository Dependencies

Explicit destructive intent is required for configured repository dependency deletion. A request to inspect, detach, or clean state, or to perform branch/worktree cleanup, does not grant permission to delete a configured dependency; do not infer that permission. Route branch/worktree cleanup through the appropriate existing command and installed help.

Inspect the installed `aw delete --help` before planning an invocation. Use only parameters supported by that installed command.

`aw delete <repository>` selects one exact configured `repos.<repository>` key, not a path, branch, fuzzy match, or alias. In a human TTY, omitted-target `aw delete` presents a checkbox for one or many configured keys. Every checkbox name and submitted value is exactly its configured key; the prompt exposes no repository path, Git URL, group, description, or other metadata. The selection is followed by one combined preview and one default-no confirmation. An omitted target in non-TTY or JSON mode returns `DELETE_SELECTION_REQUIRED`; neither `--force` nor `--dry-run` chooses, invents, infers, or defaults a target.

`aw delete <repository> --dry-run` produces the exact complete plan for that exact configured key without mutation. Review its complete scope and accept it only when it matches the request. Only then run `aw delete <repository> --force` with the same exact configured key. Force is appropriate only for explicitly accepted non-interactive automation or disclosed Git data-loss risk; an ordinary clean human-TTY mutation can instead use the command's combined default-no confirmation.

```bash
aw delete api --dry-run
aw delete api --force

# Human TTY only: choose one or many exact configured keys
aw delete
```

`aw delete` owns configured repository dependency deletion; `aw remove` owns branch/worktree removal. Do not substitute `aw remove`, hand-edit config, or broadly delete paths or hooks to imitate `aw delete`.

The deletion plan covers the canonical clone, all owned linked worktrees, local refs, the exact `repos.<repository>` entry, and canonical local repository-targeted hook files/templates. Delete owns only the exact qualified `<configurationRoot>/.arashi/hooks/pre-remove.<repo><ext>` and `<configurationRoot>/.arashi/hooks/post-remove.<repo><ext>` files for that repository; it does not own, delete, or remove compatible `<activeRepo>/.arashi/hooks/<lifecycle><ext>` files. It preserves unrelated config, managed-ignore policy, shared hooks, user-global hooks, remote repositories, and remote branches.

Treat dirty or unpublished work, ignored files, and local refs as data to preserve, publish, or clean rather than as automatically disposable. Obtain explicit acceptance before `--force`; force bypasses confirmation and disclosed Git data-loss guards only. Path and symlink, topology, identity, hook ambiguity, and concurrent-config safeguards remain mandatory and cannot be bypassed.

Plans and results may expose logical hook identity or hook paths, but never request, read, print, or expose hook contents or inline command bodies. Compare every planned path, ref, warning, and preserved-global indication with the requested exact key, and report material data-loss blockers without asking for secret source content.

On `DELETE_PARTIAL_FAILURE`, distinguish completed and surviving state, note later repositories that were not started, and follow the command's safe-retry guidance for each incomplete repository. Do not claim rollback, full deletion, or fully deleted state, and never replace the per-repository guidance with broad manual cleanup.

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

## Adding a Repository

Use `aw add <remote>` to add a repository to a configured workspace. When run interactively, the command walks through repository configuration and hook initialization.

Direct the user to run `aw add <remote>` themselves when they want the guided flow or need to decide which files should be copied or symlinked and which repository hooks should be initialized. Do not suggest `--json` or `--force` for that flow; those options skip the interactive setup.

For a substantial or reusable repository remove script, add creates or installs `<configurationRoot>/.arashi/hooks/<lifecycle>.<repo><ext>`. Compatible child-local files stay supported external state; do not create or duplicate a qualified file when `<activeRepo>/.arashi/hooks/<lifecycle><ext>` already claims that repository slot.

If the user only wants the minimal repository entry and has supplied the remote and any required name, the agent can run `aw add` directly. Do not use `aw add` to edit an existing entry; use `aw configure` for supported edits and reserve direct editing of `.arashi/config.json` for unsupported canonical fields, following [Repository Worktree File Materialization](create.md#repository-worktree-file-materialization) and the [Lifecycle Hooks reference](../hooks.md), then validate with `aw doctor --json`.

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
