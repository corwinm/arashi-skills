# Command Reference

Common command patterns for installing and using the Arashi CLI.

## Most Common Commands

```bash
# verify Arashi CLI
arashi --version

# inspect command surface
arashi --help
```

The installed `arashi --help` and `arashi <command> --help` are the parameter authority. Common command-local aliases are `-v/--verbose`, `-f/--force`, `-j/--json`, `-o/--only`, `-g/--group`, and `-n/--dry-run`; use long forms in consequential examples when they are clearer. Exceptions are intentional: `add -n/--name` remains command-local name syntax, and `exec --jobs` remains long-only so `-j` means JSON on `exec`. These aliases describe the current CLI surface and do not claim native shell completion.

## Installation

Installation instructions are maintained on the Arashi website:

- https://arashi.haphazard.dev

Use the website flow for your platform and environment policy.

Expected outcomes:

- `arashi --version` exits `0`
- `arashi --help` exits `0`

## Shell Completion

Arashi generates native completion for each supported shell through one public command:

```bash
arashi completion bash
arashi completion zsh
arashi completion fish
```

Completion activation and the parent-shell wrapper are separate manual choices. `arashi shell init <shell>` emits only the manual wrapper; it does not activate completion. `arashi shell install` owns both wrapper and completion activation lines in its managed profile block, and repeated installs idempotently upgrade the complete block. Use the manual commands in [the tutorial](tutorial.md) when you want to activate either feature independently.

Static command and option completion works outside a configured workspace. Dynamic ownership is exact: each `--only` segment completes repository names; each `--group` segment completes configured groups; `switch [filter]` and `remove [target]` complete branch, worktree name, or path values, while `--path` narrows them to exact worktree paths; `move --from` and `move --to` complete workspace branch, name, or path references; supported-shell arguments and finite constrained options complete only their declared values; unclassified slots receive no local candidates. Each request has a 200 ms whole-query budget and uses only local read-only discovery: no network requests, hooks, prompts, workspace mutation, or child-repository operations. Budget expiry or discovery failure is silently empty while static completion remains available. Generated completion functions invoke `command arashi` so wrapper functions cannot recursively intercept completion queries.

Zsh and Fish can present candidate descriptions from Arashi's shared completion model. Bash's native programmable-completion UI does not generally display per-candidate descriptions, although the shared model retains them. The npm-managed wrapper and standalone binary expose the same completion behavior and generated shell output for a given release.

## Updating Arashi

Use the docs site for current install-method guidance. The CLI can also check update availability:

```bash
# check without changing files
arashi update --check

# show the selected package-manager command or installer invocation
arashi update --dry-run

# run a supported npm-managed update non-interactively
arashi update --yes
```

`update --check` conflicts with `--dry-run` and `-n`. Arashi rejects either combination before release lookup, installer planning, package-manager execution, binary replacement, or mutation in both the native Commander path and the npm-managed wrapper path.

Bare `update --json` is inspection-only in both paths: it reports the update plan in one envelope and never prompts or applies an update. `update --json --yes` returns one `JSON_UNSUPPORTED_FOR_MODE` envelope for installer apply before mutation.

Expected outcomes:

- npm-managed installs update only when Arashi can confidently detect a supported package manager.
- official curl installer installs rerun the installer against the current binary directory when `--yes` is passed.
- ambiguous npm-managed installs do not mutate files; follow the printed manual commands.

## Workflow Execution

Choose one workflow from [Workflows](workflows.md).

Order of operations:

1. Execute one workflow from start to finish.
2. Confirm expected outcomes from the workflow doc.
3. If a command is missing or behaves unexpectedly, verify setup with `arashi --version` and use [Troubleshooting](troubleshooting.md).

## JSON Output for Automation

Prefer `--json` when you need to parse Arashi command results for decisions, reports, editor integrations, or follow-up commands. Human-readable output is for users; JSON output is for agents and scripts.

Expected JSON-mode behavior:

- stdout is exactly one JSON document when the command accepts `--json` and reaches command-level execution.
- success envelopes include `ok: true`, `command`, `schemaVersion: 1`, command-specific `data`, and `warnings`.
- command-level failures exit non-zero and include `ok: false`, `command`, `schemaVersion: 1`, `error`, and `warnings`.
- JSON mode does not prompt; missing selections or confirmations return structured errors such as `INTERACTIVE_INPUT_REQUIRED`.
- configured `init`, `pull`, `clone`, `add`, and `create` results include managed-ignore inspection or reconciliation details in their existing envelope, including effective scope, sources, per-path status, planned or applied changes, warnings, unsafe skips, and final changed state.
- `arashi doctor --json` reports managed-ignore problems as stable diagnostic findings rather than repairing them.

Use JSON mode for automation-relevant commands including `add`, `clone`, `create`, `doctor`, `exec`, `handoff`, `init`, `list`, `move`, `prune`, `pull`, `push`, `remove`, `setup`, `status`, `sync`, and `update`.

## Handoff Reports

Use `arashi handoff` when an agent needs to pause, switch with another worker, request review, or leave dirty coordinated work with explicit context.

```bash
# Markdown report for chat, issues, or PR comments
arashi handoff \
  --link https://github.com/corwinm/arashi-arashi/issues/186 \
  --validation "bun run test — passed" \
  --todo "watch CI" \
  --risk "Windows matrix pending" \
  --next-command "gh pr checks 123 --repo corwinm/arashi"

# Parseable report for another agent or script
arashi handoff --json --link https://github.com/corwinm/arashi-arashi/issues/186
```

Expected outcomes:

- Markdown mode includes workspace path/branch, current repository context, per-repository status, dirty or error repositories needing attention, related links, validation evidence, todos, risks, and next commands.
- Markdown is the default; omit the deprecated compatibility spelling `--markdown` from preferred commands.
- JSON mode emits one envelope with `command: "handoff"`, workspace metadata, per-repository status records, supplied context arrays, warnings, and generated next-command hints.
- `arashi handoff` is read-only: it does not run validation commands, stage files, commit, push, delete worktrees, or write report files by default.
- Only pass `--validation` entries for commands that actually ran; put pending or unverified checks in `--todo` or `--risk`.

## Repository Group Filters

Workspaces can declare semantic repository sets with `repos.<name>.groups` arrays in `.arashi/config.json`:

```json
{
  "repos": {
    "arashi": { "path": "repos/arashi", "groups": ["core"] },
    "arashi-docs": { "path": "repos/arashi-docs", "groups": ["docs"] },
    "arashi-vscode": {
      "path": "repos/arashi-vscode",
      "groups": ["extensions"]
    },
    "arashi-skills": {
      "path": "repos/arashi-skills",
      "groups": ["agents", "docs"]
    },
    "deploy": { "path": "repos/deploy", "groups": ["infra"] }
  }
}
```

Common group names include `core`, `docs`, `extensions`, `agents`, and `infra`. Use `--group <group>` on repo-selecting commands when a known semantic set matches the task better than enumerating repositories with `--only`.

Repository selectors accept repeated occurrences, comma-separated values, or both. Shared normalization preserves encounter order, trims whitespace, ignores blank segments beside valid values, and deduplicates by first occurrence. Explicitly supplied selectors that normalize to empty, unknown values, and valid filters with no matches fail closed before repository discovery or mutation. `--only` and `--group` intersect; an empty intersection is an error rather than an empty successful run. `status --only` is configured-workspace-only, includes the established parent report while limiting child inspection, and is rejected in standalone mode along with `status --group`.

Examples:

```bash
arashi status --group docs
arashi create feat/docs-refresh --group docs --no-launch --no-switch
arashi exec --group docs -- bun run validate
arashi pull --group infra --json
arashi setup --group extensions
arashi sync --group agents
arashi push --group core --set-upstream --dry-run
```

`--group` composes with `--only` by intersection. If both are supplied, a repository must match the explicit name filter and belong to at least one requested group. For example, `arashi exec --only arashi,arashi-docs --group docs -- bun run validate` runs only in `arashi-docs` when `arashi-docs` is the only named repository in the `docs` group. Unknown groups and valid filters that produce an empty intersection are reported as selection errors before mutating commands run.

Unsupported launch, shell-code, or interactive modes return a structured error instead of mixing human output into JSON:

```json
{
  "ok": false,
  "command": "switch",
  "schemaVersion": 1,
  "error": {
    "code": "JSON_UNSUPPORTED_FOR_MODE",
    "message": "JSON output is not supported for this mode",
    "details": {
      "mode": "launch"
    }
  },
  "warnings": []
}
```

When `error.code` is `JSON_UNSUPPORTED_FOR_MODE`, retry with a non-launching or non-interactive mode if available. Otherwise run without `--json` only when the user wants the human-facing action, such as opening an editor, changing a shell, or emitting shell integration code.

## Publishing Coordinated Branches

Use `arashi push` after committing implementation changes and before opening cross-repo PRs.

```bash
# preview first when publishing a new coordinated branch
arashi push --set-upstream --dry-run

# publish eligible changed repositories and set upstreams where needed
arashi push --set-upstream

# publish only one affected child repo
arashi push --only arashi-docs --set-upstream

# publish changed docs repositories only
arashi push --group docs --set-upstream

# parse push results in automation
arashi push --set-upstream --json
```

Expected outcomes:

- changed repositories with publishable local branch commits are pushed
- clean or intentionally untouched child repositories are skipped with reasons
- `--dry-run` previews without mutating remotes
- `--json` emits one envelope with per-repository results, totals, and warnings for skipped repositories

## Workspace Initialization

Prefer configured mode whenever a project can adopt Arashi, including a single repository that needs repository/workspace hooks, persisted defaults, or custom paths. Choose initialization by workspace mode:

- Use ordinary `arashi init` for configured child repositories, groups, hooks, defaults, custom managed paths, or coordinated commands.
- Use `arashi init --zero-config` for ad hoc work in an existing non-bare Git project that has not adopted Arashi, using the fixed root-level `.worktrees/<branch>` layout.

Preview or automate standalone bootstrap without changing its local-only policy:

```bash
arashi init --zero-config --dry-run
arashi init --zero-config --json
arashi init --zero-config --dry-run --json
```

Zero-config init accepts its mode flag plus `--dry-run`, `--verbose`, and `--json`; do not combine it with configured-init options such as `--repos-dir`, `--worktrees-dir`, `--ignore-scope`, `--force`, or `--no-discover`. It creates no `.arashi/config.json`, does not edit tracked `.gitignore`, and does not create or modify global Git configuration. If no effective rule already covers the deterministic probe, it adds only the literal `.worktrees/` rule to the repository-local exclude file resolved by Git. Dry-run plans the same directory and rule actions without writes; JSON mode emits one structured envelope.

Passive standalone discovery requires an existing main-root `.worktrees/` directory and never repairs missing ignore coverage. `create`, including `create --dry-run`, checks the exact planned destination before mutation. A branch named `feature/auth` therefore requires `.worktrees/feature/auth` to be effectively ignored and is created at that exact path. To independently check the same gate from the main root, run `branch=feature/auth`, `destination=".worktrees/$branch"`, then `git check-ignore --no-index -q -- "$destination"` and require exit status `0` before creating.

Supported standalone lifecycle commands are `create`, `list`, `status`, `switch`, `remove`, `prune`, `doctor`, `move`, and `handoff`. Invoking them from the main worktree or a linked worktree resolves the same sole main repository. Repository or group filters on these commands, including `create --only`, `create --group`, `status --group`, interactive multi-repository selection, and `switch --repos` or `switch --all`, have no standalone meaning and fail clearly.

The child-coordination commands `add`, `clone`, `sync`, `pull`, `push`, `exec`, and `setup` are configured-only. Run ordinary `arashi init` to upgrade before using them; do not interpret an empty repository map as a successful no-op.

For configured mode, run `arashi init` from an existing repository root, or from a non-repository parent directory when you want Arashi to create the repository during setup.

When an existing repository is bare, run init from the bare repository or a Git-discoverable descendant. Arashi canonicalizes the workspace to the absolute bare repository directory before it reads or writes configuration.

Initialize an existing repository with defaults:

```bash
arashi init
```

Bootstrap the current directory as a new repository:

```bash
mkdir my-arashi-workspace
cd my-arashi-workspace
arashi init
# prompt: Repository target ('.' for current directory or a child directory name) -> .
```

Bootstrap a child repository from a parent directory:

```bash
mkdir scratch
cd scratch
arashi init
# prompt: Repository target ('.' for current directory or a child directory name) -> my-arashi-repo
cd my-arashi-repo
```

Use a custom repositories directory:

```bash
arashi init --repos-dir ./workspace-repos
```

Use a custom worktree base directory:

```bash
arashi init --worktrees-dir ./workspace-worktrees
```

An explicit `--worktrees-dir` wins over the repository-aware omitted default in either repository type and is normalized before persistence.

Choose an explicit clone-local ignore preference only when the repository-local default is not appropriate:

```bash
# write missing managed-directory rules to the workspace-root .gitignore
arashi init --ignore-scope tracked

# do not write ignore files; report unignored managed paths instead
arashi init --ignore-scope none

# restore the repository-local default in an existing configured workspace
arashi init --ignore-scope local
```

Expected outcomes:

- `.arashi/config.json` includes `reposDir` and `worktreesDir`.
- when `--worktrees-dir` is omitted, a canonical bare repository defaults to `..`, while a non-bare repository defaults to `.arashi/worktrees`.
- an existing configured value remains authoritative for later commands and preference-only init; Arashi uses `.arashi/worktrees` only as the compatibility fallback for a legacy config that omits the field. Forced reinitialization recalculates the omitted default from repository type.
- bootstrap mode accepts only `.` or a direct child directory name.
- in non-bare repositories, safe configured repository and worktree directories are checked against Git's effective tracked, repository-local, and global ignore sources before any write.
- with no explicit or stored preference, missing rules are added to the repository-local exclude file resolved by Git; tracked `.gitignore` is unchanged.
- `tracked` and `none` are stored in clone-local Git state, not shared `.arashi/config.json`; selecting `local` clears the non-default preference.
- `arashi init --ignore-scope local` can reset only the preference and reconcile an existing valid workspace without `--force` or reinitializing configuration, hooks, or repositories.
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

Run `arashi doctor --json` to inspect missing rules, stale Arashi-owned entries, invalid stored scope, or unsafe configured paths without mutation. Follow its suggested repair; use `arashi init --ignore-scope local` to restore the default when that is the intended preference. Do not repair Arashi by setting `core.excludesFile` or editing any global Git configuration.

## SSH Remote Aliases for Add and Clone

Configured workspaces accept Git's explicit-user SCP form, omitted-user SCP form, and `ssh://` form. For example:

```bash
arashi add git@work-github:acme/api.git
arashi add work-github:acme/api.git
arashi add ssh://git@work-github/acme/api.git
arashi add ssh://work-github/acme/api.git
```

The host token is opaque: Git/OpenSSH owns host resolution and authentication. Arashi does not read, manage, or resolve SSH configuration, does not run an independent SSH connectivity probe, and does not synchronize aliases, keys, identities, or routing. It passes the remote to Git and reports Git's failure in the normal command result.

`add` trims outer whitespace once, then uses that same normalized remote for Git, result output, and persisted configuration. `clone` treats configured remotes as authoritative. If HTTPS is inferred or selected, Arashi preserves every configured SSH URL byte-for-byte and never automatically rewrites an SSH remote to HTTPS; a mixed clone run can therefore remain mixed. HTTPS-to-SSH conversion remains supported for an HTTPS source because that source supplies an explicit network host and path.

An unresolved or unauthenticated alias follows the existing command safety behavior. Failed `add` uses the normal add rollback boundary for configuration, clone, setup, and managed-ignore state. During a multi-repository `clone`, one Git failure is recorded for that repository; clone continues with the remaining repositories and reports partial success through the existing human or JSON envelope.

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

## Adding a Repository from a Linked Parent Worktree

A direct add from the canonical parent checkout keeps the existing one-clone flow: Arashi clones beneath that checkout's configured `reposDir` and updates that checkout's `.arashi/config.json`.

From a linked parent worktree, Arashi clones the child beneath the canonical parent checkout's configured `reposDir`, leaves that canonical clone on the detected child default branch, and creates the active child path as a linked worktree on the active parent branch. Only the active parent worktree's `.arashi/config.json` receives the new repository entry; linked add does not edit the canonical parent checkout's tracked configuration. Do not manually create a second clone.

If a matching `origin/<active-parent-branch>` remote-tracking ref exists, the coordinated local branch tracks that ref; otherwise Arashi creates it from the detected child default branch. The canonical clone remains on the child default branch while the active child worktree checks out the coordinated branch.

Before materialization, linked add evaluates effective ignore coverage for both canonical and active destinations. With `local` scope, the common repository exclude authority must cover both destinations; with `tracked` scope, the canonical destination must already be ignored from the canonical checkout before Arashi may reconcile the active branch's `.gitignore`; with `none`, Arashi writes no ignore files, reports each unignored destination, and may continue under the explicit opt-out policy. Linked add never edits the canonical checkout's tracked `.gitignore`; if tracked scope does not already protect the canonical destination, reconcile and commit that rule on the branch checked out in the canonical parent checkout before retrying. A managed-ignore-unsafe `reposDir`, including an absolute path or repository-root value such as `.`, retains single-placement behavior in the active workspace rather than attempting two coordinated materializations.

Materialization and config persistence are one rollback boundary. If linked-worktree cleanup or final-state observation is incomplete, rollback retains the canonical clone, coordinated branch, and applicable managed-ignore coverage because the surviving linked child depends on the canonical clone's Git common directory. Human and JSON results distinguish the config-relative repository path, canonical clone/default branch, and active worktree/coordinated branch; `--json` remains one document without human progress on stdout.

## Repository Cloning and Recovery

Before choosing lower-level recovery commands, use `arashi doctor --json` for structured, non-mutating workspace health diagnostics. Follow the reported finding codes, severities, and suggested commands to decide whether to run `status`, `clone`, `prune`, or repository-specific Git commands next.

Use `arashi clone` to clone configured repositories that are missing locally.

```bash
# interactively choose missing repositories
arashi clone

# clone all missing repositories
arashi clone --all
```

Expected outcomes:

- command exits `0` when clone operations succeed
- managed ignore state is reconciled before a missing repository path is materialized
- already-present repositories are skipped
- `arashi status` no longer reports missing repository spawn errors

## Multi-Repository Command Execution

Use `arashi exec` when you need to run the same non-interactive inspection or validation command from each selected managed repository. Put the child command after `--`; Arashi options must come before that delimiter, and child command options must come after it.

```bash
# inspect working-tree changes across selected managed repositories
arashi exec -- git status --short

# inspect only repositories with local changes
arashi exec --dirty -- git diff --stat

# validate one known repository with structured output for agents/scripts
arashi exec --only arashi-docs --json -- bun run validate

# validate a known semantic group
arashi exec --group docs -- bun run validate

# run tests with bounded concurrency and stop scheduling new repos after a failure
arashi exec --only arashi,arashi-docs --jobs 2 --fail-fast -- bun run test

# pass flags to the child command after the delimiter
arashi exec --only arashi -- bun run test -- --watch=false
```

Safety guidance for agents:

- Prefer `arashi exec` for repeated multi-repo validation and inspection (`git status --short`, `git diff --stat`, `bun run test`, `bun run lint`, docs validation).
- Use explicit filters for mutating, expensive, network-heavy, or long-running commands. Prefer `--group <group>` for known semantic sets and `--only <repo>` or a narrow comma-separated list for one-off selections. Do not fan out those commands to every managed repository unless the user asked for all repositories.
- Remember that `--group` intersects with `--only` and narrows the explicit repository list when both are supplied.
- Use `--dirty` when the command should inspect only repositories with local changes.
- Keep execution serial by default. Add `--jobs <n>` only when the command is safe to run concurrently and shared resources such as package-manager caches, ports, databases, or generated artifacts will not conflict.
- Add `--fail-fast` for expensive validation when later repository runs are not useful after the first failure. Already-running jobs may still finish when combined with `--jobs`.
- Prefer `--json` when an agent or script needs to parse per-repository stdout, stderr, child exit status, duration, selected repositories, or aggregate totals. Any child command failure makes the `arashi exec` process exit non-zero.

Expected outcomes:

- each child command runs with the selected repository path as its working directory
- human output is grouped by repository and ends with an aggregate summary
- `--only` errors for requested repositories that are not configured or locally present
- `--dirty` exits successfully without running the child command when no dirty repositories match
- invalid options, missing child command arguments, and invalid `--jobs` values fail before repository commands execute

## Worktree Switching

Use `arashi switch` to open a terminal context for an existing worktree, or change the current shell directory when shell integration is active.

```bash
# parent workspace worktrees (default)
arashi switch

# child repositories in current workspace only
arashi switch --repos docs

# include parent workspaces + nested child repo worktrees
arashi switch --all

# select one exact worktree by full path
arashi switch --path /path/to/worktree

# force Cursor / VS Code / Kiro for one run
arashi switch --cursor feature-auth
arashi switch --vscode feature-auth
arashi switch --kiro feature-auth

# request parent-shell cd when shell integration is active
arashi switch --cd feature-auth

# force launch behavior for one run while preserving a configured launcher
arashi switch --launch feature-auth

# sesh mode inside tmux
arashi switch --sesh

# force plain tmux for this invocation
arashi switch --tmux feature-auth

# explicitly open or focus the worktree in Herdr
arashi switch --herdr feature-auth

# request a tab/equivalent in the selected launcher for this invocation
arashi switch --tab feature-auth
arashi switch --tab --herdr feature-auth

# capability failure example: explicit IDEs do not expose tab launch
arashi switch --tab --vscode feature-auth

# bypass a configured explicit sesh or Herdr switch mode without forcing behavior
arashi switch --ignore-configured-launcher feature-auth

# force generic automatic launch and bypass a configured named launcher
arashi switch --launch --ignore-configured-launcher feature-auth
```

Expected outcomes:

- success-oriented commands above exit `0` and open the selected target in a new context; the explicitly labeled VS Code capability example exits nonzero with `TAB_DISPOSITION_UNSUPPORTED`
- configured `defaults.switch.mode` is the single switch default and accepts `auto`, `cd`, `launch`, `sesh`, and `herdr`; when omitted, Arashi keeps automatic launch behavior rather than preferring `cd`
- contextual `auto` resolves in this order: tmux → Herdr → cmux → integrated IDE → Kitty → parent-shell `cd` → terminal application/platform fallback
- in a cmux-managed terminal, automatic launch creates and focuses a cmux workspace at the exact selected worktree
- Arashi recognizes cmux from a non-empty `CMUX_WORKSPACE_ID` or `CMUX_SURFACE_ID`; `CMUX_SOCKET_PATH` alone does not activate cmux behavior
- cmux launch requires cmux v0.64.18 or newer, the `cmux workspace create` command, and local socket access
- cmux command, socket, malformed JSON, or missing workspace identifier failures return `LAUNCH_FAILED` without opening standalone Ghostty
- explicit IDE or sesh launch choices keep precedence, and an active tmux session nested inside cmux keeps tmux behavior
- explicit `--tmux` requires a non-empty trimmed `TMUX`, overrides configured and detected launch behavior, and never falls back to another launcher
- explicit `--herdr` selects Herdr outside a managed pane; conflicting explicit launcher flags and `--cd --herdr` are rejected
- with no explicit or configured launcher, trimmed `HERDR_ENV` must equal exactly `1` to select Herdr automatically; automatic tmux remains earlier, while Herdr is earlier than cmux, IDE, and terminal fallbacks
- positively detected Kitty is automatic only, requires Kitty 0.43+ with permitted remote control, and reports `mode: "kitty"`; there is no explicit Kitty launcher flag, and `kitty` is not a persisted create or switch mode
- once managed Kitty is selected, version, permission, state, duplicate, focus, or launch failure reports actionable `LAUNCH_FAILED` detail and does not fall back to another launcher
- `arashi switch --cd` changes the current shell directory when invoked through the installed shell wrapper; without shell integration it warns and does not launch an alternate context
- `--launch` preserves a configured `sesh` or `herdr` launcher while forcing launch behavior
- `--ignore-configured-launcher` alone bypasses only a configured `sesh` or `herdr` launcher; it preserves configured or contextual `auto`, `cd`, or `launch` behavior and does not independently force or prevent parent-shell `cd`
- The exact generic automatic-launch request is `--launch --ignore-configured-launcher`; explicit launcher and tab selectors remain authoritative and keep their prerequisite, failure, and no-fallback policy
- `--repos` matches repository names first (exact match preferred)
- `--repos` with no matches lists available child repositories
- `--path` matches one exact worktree path and skips fuzzy branch/path matching
- `--vscode`, `--cursor`, and `--kiro` override configured switch defaults for a single invocation
- when shell integration is inactive, explicit `--cd` warns without launching another context; configured `mode: "cd"` warns and falls back to automatic launch
- compatible editor hosts can pass the matching switch flag automatically when running Arashi through the extension
- extension-driven switch selections use exact path mode so duplicate branch names do not create ambiguous CLI matches

### Launch disposition (`--tab`)

Default launch opens a new window or independent managed session. `--tab` is a one-shot CLI-only launch disposition on `switch` and `create`; it is never persisted in `.arashi/config.json`, and the existing create/switch configuration contracts remain unchanged. A tab request preserves the selected app, profile, shell, and cwd and never silently falls back to a window, another launcher, or a generic terminal.

`switch --tab` expresses explicit launch intent. It overrides configured or contextual parent-shell `cd` and bypasses configured launcher defaults, so it uses automatic launcher resolution without another override. It conflicts only with explicit `--cd` and composes with canonical `--launch`, `--ignore-configured-launcher`, and launcher selectors such as `--vscode`, `--cursor`, `--kiro`, `--tmux`, `--sesh`, and `--herdr`; an explicit selector remains authoritative while `--tab` controls its disposition, and the selected adapter decides capability. `switch --tab --launch` and `switch --tab --ignore-configured-launcher` are compatible same-intent combinations. `switch --tab --json` returns `JSON_UNSUPPORTED_FOR_MODE` with `details.mode: "launch"` and exits `2`.

For create, the complete precedence examples are:

```bash
# tab intent implies both launch and selection
arashi create feature-auth --tab

# positive tab intent wins over both negative flags
arashi create feature-auth --tab --no-launch --no-switch

# positive launch/switch flags are compatible and redundant with tab intent
arashi create feature-auth --tab --launch
arashi create feature-auth --tab --switch

# preview the resolved tab launch without mutation
arashi create feature-auth --tab --dry-run
```

`create --tab` implies launch and switch, bypasses configured generic or editor-scoped launch defaults, wins over `--no-launch` and `--no-switch`, and uses automatic contextual launcher resolution unless `--tmux`, `--sesh`, or `--herdr` explicitly selects the adapter. `create --tab --launch` and `create --tab --switch` are compatible. `create --tab --json` returns `JSON_UNSUPPORTED_FOR_MODE` with `details.mode: "interactive-or-launch"` and exits `1`. Both JSON guards run before option-conflict or contextual validation, and stdout remains exactly one JSON document. After authoritative workspace/config resolution, a knowable unsupported tab request fails before managed-ignore reconciliation, hooks, branch creation, or worktree creation. Dry-run previews tab intent without mutation and does not require runtime-only session evidence. If a supported launch is attempted but fails at runtime, Arashi reports partial failure, preserves every successfully created worktree, and does not retry as a window or another launcher.

The exact tab JSON refusal envelopes include these command fields and modes:

```json
{
  "ok": false,
  "command": "switch",
  "schemaVersion": 1,
  "error": {
    "code": "JSON_UNSUPPORTED_FOR_MODE",
    "message": "JSON output is not supported for this mode",
    "details": { "mode": "launch" }
  },
  "warnings": []
}
```

```json
{
  "ok": false,
  "command": "create",
  "schemaVersion": 1,
  "error": {
    "code": "JSON_UNSUPPORTED_FOR_MODE",
    "message": "JSON output is not supported for this mode",
    "details": { "mode": "interactive-or-launch" }
  },
  "warnings": []
}
```

For each refusal, Arashi emits exactly one JSON document on stdout and keeps stderr silent. Enforce the guard independently at both the Commander action boundary and the exported executor, before option or context validation and before workspace, configuration, or terminal discovery. Therefore conflicting launcher flags, absent context evidence, and direct exported calls still receive the command-specific envelope before any repository, worktree, config, or launcher lookup.

Managed context outranks the outer terminal. For example, Ghostty inside tmux uses a tmux window; Ghostty inside Herdr uses a Herdr tab; cmux uses a workspace (its vertical-tab equivalent). Bare macOS Ghostty 1.3+ uses a Ghostty tab. Bare Terminal.app returns `TAB_DISPOSITION_UNSUPPORTED` before target preflight, AppleScript, command execution, or fallback launch. To use a true Terminal.app tab, press Command-T manually, then run `arashi switch --cd`; this requires active Arashi shell integration. To request normal automatic launch, run `arashi switch --launch --ignore-configured-launcher` directly; it opens a new Terminal window when automatic launcher resolution selects Terminal.app. Bare Git Bash/MinTTY returns an actionable `TAB_DISPOSITION_UNSUPPORTED` and does not fall back to a new window. An automatically detected IDE whose CLI is unavailable continues canonical terminal/platform resolution; after that resolution, apply the selected launcher's tab mapping or capability, and do not classify the unavailable IDE as a selected unsupported IDE.

| Launcher/context | Default `window` disposition | Explicit `tab` disposition |
|---|---|---|
| Windows Terminal | `wt.exe -w new new-tab`, preserving non-empty `WT_PROFILE_ID` with `-p` and exact path with `-d` | `wt.exe -w 0 new-tab` with the same profile/path handling; failure returns `LAUNCH_FAILED` without fallback |
| Standalone Git Bash / configured MinTTY | Existing `git-bash.exe --no-cd` path, direct detached MinTTY compatibility fallback, then safe shell fallback for an independent window | `TAB_DISPOSITION_UNSUPPORTED`; the host exposes no stable tab target, so use the default window or Windows Terminal |
| WezTerm | `wezterm cli spawn --new-window --cwd <path>` in the current domain, with a process-start fallback that still explicitly requests an independent window | `wezterm cli spawn --pane-id <WEZTERM_PANE> --cwd <path>` in the exact current GUI context; missing non-empty `WEZTERM_PANE` returns `TAB_DISPOSITION_UNSUPPORTED` before process execution |
| Managed Kitty | Exact Arashi worktree session creation/focus/reuse, documented as the independent-session equivalent | The same exact managed Kitty tab/session primitive, reported as the tab equivalent rather than a window fallback |
| Unmanaged Kitty | New Kitty OS window at the exact worktree path | `TAB_DISPOSITION_UNSUPPORTED` unless managed remote-control evidence is present; never probe an unrelated Kitty instance |
| tmux and sesh | Existing `tmux new-window -c <path>` and sesh connect primitive, documented as the independent-session equivalent | The same tmux/sesh managed primitive, explicitly reported as the tab equivalent |
| cmux | Existing create-and-focus workspace operation, documented as the independent-session equivalent | The same workspace/vertical-tab primitive, explicitly treated as cmux's in-session tab equivalent |
| Herdr | Existing `herdr worktree open` open/focus of the exact worktree workspace, requiring a non-bare source checkout | `herdr tab create` in non-empty exact `HERDR_WORKSPACE_ID`; missing active-workspace evidence returns `TAB_DISPOSITION_UNSUPPORTED`, and this tab path does not require a non-bare source checkout |
| Automatically detected IDE with unavailable CLI | Continue canonical terminal/platform resolution; use the selected terminal/platform launcher's default window or independent-session mapping | Continue canonical terminal/platform resolution, then apply that selected launcher's tab mapping/capability; do not classify the unavailable IDE as a selected unsupported IDE |
| VS Code / Cursor / Kiro | Existing explicit `--new-window <exact-worktree-path>` workspace launch | `TAB_DISPOSITION_UNSUPPORTED`; editor workspaces are not terminal tabs |
| Linux Ghostty | `ghostty +new-window --working-directory <path>` | `TAB_DISPOSITION_UNSUPPORTED`; never map the request to `+new-window` |
| macOS Ghostty older than 1.3 or missing supported-version evidence | Existing explicit independent-process window mapping | `TAB_DISPOSITION_UNSUPPORTED`; no supported tab API is available |
| macOS Ghostty 1.3+ | AppleScript `new window with configuration`, preserving exact cwd and current shell as data | AppleScript `new tab in <captured-window> with configuration`; missing supported-version evidence or an exact target window returns `TAB_DISPOSITION_UNSUPPORTED` before automation |
| Terminal.app | One static AppleScript transaction creates a new window/tab object with exact cwd, current shell, and captured settings when available | `TAB_DISPOSITION_UNSUPPORTED`; supported Terminal.app automation cannot safely create a true tab in an exact selected window |
| iTerm2 | One static AppleScript transaction creates a new window with the captured current profile when available | One static AppleScript transaction creates a tab in the exact captured target window with the captured profile; a missing target returns `TAB_DISPOSITION_UNSUPPORTED` |
| Generic Linux/macOS/Windows fallback | Existing platform-specific independent process/window sequence | `TAB_DISPOSITION_UNSUPPORTED`; no generic cross-terminal tab protocol exists |

For WezTerm and Herdr, an empty or missing exact pane/workspace identifier is unsupported. iTerm2 and macOS Ghostty require an exact target window, and Ghostty also requires supported-version evidence. Any missing target or supported-version evidence returns `TAB_DISPOSITION_UNSUPPORTED` before any process, automation, or fallback attempt. Denied or failed automation for a supported macOS tab adapter returns `LAUNCH_FAILED` and never falls back to a new window, another launcher, or generic terminal. Denied or failed read-only macOS automation preflight for a supported tab adapter returns `LAUNCH_FAILED` before create mutation or switch launch, with no fallback. Across every supported row, preserve the selected app/profile, current shell, and exact cwd; pass paths as distinct process arguments or through a static data-only automation protocol, strip shell-directive state from launched children, and never interpolate user-derived paths or commands into shell or AppleScript source.

Configured and implicit-standalone `switch --tab` and `create --tab` use the same resolver and failure semantics. Standalone invocations do not create or persist `.arashi` configuration; they use the already discovered standalone worktree layout without synthesizing configured defaults.

Default Herdr launch continues to use `herdr worktree open` and requires a non-bare source checkout. `--tab --herdr` instead runs `herdr tab create` in the active workspace identified by `HERDR_WORKSPACE_ID` and does not require a non-bare source checkout.

## Repository Worktree File Materialization

Configured mode accepts direct `repos.<name>.copy` and `repos.<name>.symlink` arrays. Each declared repository-relative path uses the same relative path in the canonical Git primary source checkout and the new worktree destination. This configuration is configured-only and is not available in zero-config standalone mode.

For each repository, Arashi runs repository pre-create, then every copy entry in declaration order, then every symlink entry in declaration order, and then repository post-create. `--no-hooks` disables hooks only and does not disable declarative materialization.

A missing source is skipped visibly. Destinations never overwrite an existing object and never escape the new worktree. A symlink is a native symbolic link to the exact canonical source target; platform or policy capability failures are actionable and never fall back to a copy, hard link, or junction.

`arashi create --dry-run` previews the ordered materialization plan in declaration order without mutation. `arashi doctor` non-mutatively diagnoses configured source availability and managed destination safety without repair or capability probes.

Use `copy` for `.env` or local configuration that must be independently mutable in each worktree; the supported same-path case does not require a shell hook. Use `symlink` only for intentionally shared state, because mutation is shared with the canonical checkout and native symbolic-link capability varies by platform.

For normal dependency setup, prefer package-manager content-addressed stores plus per-worktree installs. Treat symlinked `node_modules` or equivalent shared dependency trees as advanced and risky: branches, lockfiles, runtimes, native modules, and install scripts can diverge or mutate shared state.

Use lifecycle hooks when you need globs, remapping, external sources, interpolation, required entries, or conditional behavior. Do not invent unsupported materialization fields. See [Hooks](hooks.md) for the custom-setup escape hatch.

## Create from a Coordinated Base Branch

Use the workspace-generic `defaults.create.baseBranch` setting when follow-up branches should start from the same long-running branch in the parent and managed repositories. It is not editor-scoped or per-repository configuration:

```json
{
  "defaults": {
    "create": {
      "baseBranch": "feature/FEAT-1234"
    }
  }
}
```

For one invocation, use `arashi create <target> --base <branch>`; for example, `arashi create feature/FEAT-1234/docs --base feature/FEAT-1234`. Precedence is CLI > configuration > legacy behavior: `--base` overrides `defaults.create.baseBranch`, and omitting both preserves the established configured and standalone start-point behavior.

Arashi resolves the requested base in every effective selected repository, including repositories whose target will be reused, using the local branch first and then `origin/<branch>`; it captures the resolved commit OID, and all resolution failures are aggregated before hooks or any workspace mutation. `--only` and `--group` limit that effective set and still compose by intersection. Resolution is read-only and does not fetch another remote. New targets use the captured commit OID even if the selected ref moves after preflight.

`--base` applies only to newly created targets. For a target accepted with `--conflict REUSE_EXISTING`, base resolution remains required, but the target receives no mutation: Arashi keeps its exact existing OID and does not reset, rebase, recreate, or rewrite it. Arashi does not assert or check ancestry and does not represent or claim that the reused target was derived from the requested base.

In implicit standalone mode, explicit `--base` is invocation-only and does not load or persist `defaults.create.baseBranch`; when omitted, standalone create continues to start new targets from the current `HEAD`. Human `--dry-run` output reports the requested base and each repository's resolved ref without mutation. With `--json` or `--dry-run --json`, stdout remains exactly one JSON document. `requestedBranch` is the normalized logical branch after removing at most one leading `origin/`, `source` is exactly `cli` or `config`, and `targetAction` is exactly `created` or `reused`.

Successful base data contains the complete selected set. Each repository entry has exactly `repositoryName`, `repositoryPath`, `resolvedRef`, `resolvedOid`, and `targetAction`; `repositoryPath` is canonical absolute, and entries use effective selected-repository order. Missing bases return `CREATE_BASE_RESOLUTION_FAILED`; error details contain exactly `requestedBranch`, `source`, and `repositories`, with only affected repositories from the selected set, while unaffected selected repositories are excluded. Each failure entry has exactly `repositoryName`, `repositoryPath`, and `attemptedRefs`; `repositoryPath` is canonical absolute, entries use effective selected-repository order, and `attemptedRefs` are ordered as `refs/heads/<branch>` followed by `refs/remotes/origin/<branch>`. `ARASHI_BRANCH_NAME` remains the target-branch hook context; do not invent `ARASHI_BASE_BRANCH`.

### Compatibility workaround for older Arashi releases

If the installed CLI does not yet accept `create --base`, first verify that the base exists and the target does not exist in every effective selected repository. Choose the selection once (`--only`, `--group`, or their intersection), then use the same selectors on both commands: the managed-child pre-create and the final `create`. This prevents the final materialization step from widening back to unselected repositories. Then pre-create target branches from the shared base and let `REUSE_EXISTING` materialize them without changing their ancestry:

```bash
BASE_BRANCH="feature/FEAT-1234"
TARGET_BRANCH="feature/FEAT-1234/docs"
SELECTORS=(--group docs) # Or the required --only/--group intersection.

# Managed children, not the parent.
arashi exec "${SELECTORS[@]}" -- git branch "$TARGET_BRANCH" "$BASE_BRANCH" || exit 1

# Verify and target the parent/meta workspace root explicitly.
WORKSPACE_ROOT="$(git rev-parse --show-toplevel)"
test -f "$WORKSPACE_ROOT/.arashi/config.json" || {
  printf '%s\n' "Run this workaround from the configured Arashi workspace root." >&2
  exit 1
}
git -C "$WORKSPACE_ROOT" branch "$TARGET_BRANCH" "$BASE_BRANCH" || exit 1

# Repeat the identical selectors used for managed-child pre-creation.
arashi create "$TARGET_BRANCH" "${SELECTORS[@]}" --conflict REUSE_EXISTING
```

Stop if any pre-create command fails; inspect and reconcile the already-created target branches before retrying. This workaround is only safe when the intended base exists everywhere and every pre-existing target's exact OID and ancestry have been independently verified.

## Create and Switch Defaults and Overrides

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

For `defaults.switch.mode`, choose exactly one of `auto`, `cd`, `launch`, `sesh`, and `herdr`:

- `auto` prefers strictly detected managed contexts in the order tmux → Herdr → cmux → integrated IDE → Kitty, then uses parent-shell `cd` when shell integration is active, and otherwise continues to terminal application/platform fallback.
- `cd` requests parent-shell switching. A configured `cd` warns and falls back to automatic launch when shell integration is unavailable; an explicit `--cd` instead warns without launching another context.
- `launch` always enters automatic launcher selection and does not prefer `cd`.
- `sesh` and `herdr` choose that explicit launcher regardless of detected context or shell integration.

Use one-off CLI overrides when one `arashi create` run should differ from its matching configured scope:

```bash
arashi create feature-auth --launch
arashi create feature-auth --tmux
arashi create feature-auth --sesh
arashi create feature-auth --herdr
arashi create feature-auth --tab
arashi create feature-auth --no-launch
arashi create feature-auth --no-switch
arashi create feature-auth --move-changes
```

Create launch precedence is `--sesh` or `--herdr` > `--launch` > `--no-launch` > matching configured `launch` > built-in `none`. An explicit launcher implies launch even with `--no-launch`; simultaneous `--sesh` and `--herdr` is rejected before repository discovery or mutation. `--no-launch` suppresses a configured launcher when no explicit launcher is present. Switch precedence is resolved independently before launch-implies-switch is applied.

Configured launch is unsupported with `create --json`: resolved `auto`, `sesh`, or `herdr` returns one structured unsupported-mode error before repository discovery or worktree mutation, just like explicit launch flags. Resolved `none` may continue through normal non-interactive JSON create, with stdout remaining exactly one JSON document.

Automatic launch uses tmux → Herdr → cmux → integrated IDE → Kitty → terminal/platform selection and strict environment checks. Explicit `sesh` or `herdr` bypasses automatic context detection. Launch runs only after successful creation; launcher validation or process failure preserves every successfully created worktree, reports creation separately from launch failure, and does not fall back to another launcher. Paths and labels remain distinct process arguments rather than shell-interpolated command text.

If work starts before the right coordinated worktree exists, move compatible uncommitted edits into the target workspace:

```bash
# after creating the target worktree
arashi move --to feature-auth

# explicit source and target for unattended automation
arashi move --from main --to feature-auth --json
```

Expected outcomes:

- `arashi create <branch>` leaves existing uncommitted changes in place and prints move guidance when compatible changed repositories are detected.
- `arashi create <branch> --json` includes dirty-workspace guidance as structured data, not human text.
- `arashi create <branch> --move-changes` moves compatible staged, unstaged, and untracked changes after successful worktree creation.
- `arashi move` refuses dirty target repositories and reports recovery commands if a stash-backed transfer needs manual recovery.

Use `arashi shell install` to enable parent-shell switching for bash, zsh, or fish, or `arashi shell init <shell>` for manual setup.

Precedence for create/switch launch behavior is: explicit flag > opt-out flag > config default > built-in default. `--tmux` is a per-invocation-only override: configured `auto` remains the persistent contextual path to plain tmux. In zero-config standalone and configured repositories alike, explicit tmux requires a non-empty trimmed `TMUX` and does not fall back after prerequisite or process failure.

For switch, `--tmux` conflicts with `--cd` and any explicit launcher in `--sesh`, `--herdr`, `--vscode`, `--cursor`, or `--kiro`. `--tmux --launch` is compatible launch intent, and `--tmux --ignore-configured-launcher` keeps explicit tmux authoritative while bypassing configured launchers. For create, `--tmux` implies launch and target selection: `--tmux --no-launch` and `--tmux --no-switch` still create and launch the primary worktree, while create `--tmux` conflicts with `--sesh` or `--herdr`.

Both `switch --json --tmux` and `create --json --tmux` return one structured `JSON_UNSUPPORTED_FOR_MODE` document before context validation, conflicts, launch, hooks, or repository mutation. Switch retains its `launch` mode label; create retains its `interactive-or-launch` mode label. A missing tmux context therefore creates nothing. A `tmux new-window` process failure after successful create preserves successfully created worktrees and does not try another launcher.

The configured vocabularies do not gain `tmux`: `defaults.switch.mode` still accepts only `auto`, `cd`, `launch`, `sesh`, and `herdr`, while `defaults.create.launch` still accepts only `none`, `auto`, `sesh`, and `herdr`. Configured `auto` can continue choosing plain tmux contextually.

For switch, `--launch` forces launch while preserving a configured explicit launcher. `--ignore-configured-launcher` bypasses only configured `sesh` or `herdr`; it leaves configured `auto`, `cd`, and `launch` behavior intact. Do not combine switch `--herdr` with `--sesh` or an IDE launcher, or either Herdr flag with `--json`.

### Deprecated CLI compatibility migration

Deprecated compatibility syntax remains accepted throughout Arashi 1.x: `--no-cd` maps to `--launch`, `--no-default-launch` maps to `--ignore-configured-launcher`, and `handoff --markdown` maps to omitting the format flag because Markdown is the default. Use only the canonical forms in actionable commands; removal is no earlier than 2.0 and requires a separately approved breaking-change issue.

### Legacy create-default migration

Canonical create examples use one string `launch` value. During the bounded compatibility window, Arashi still reads legacy boolean `launch` plus `launchMode` and `launch_mode` at generic and editor-hosted create scopes. Accepted legacy input is normalized only in memory, emits one scope-qualified warning with the exact canonical replacement, never rewrites the configuration file, and keeps diagnostics out of JSON stdout.

| Legacy `launch` | Legacy launcher            | Canonical replacement           |
| --------------- | -------------------------- | ------------------------------- |
| absent          | absent                     | omit `launch` (built-in `none`) |
| absent          | `auto`, `sesh`, or `herdr` | matching mode                   |
| `true`          | absent or `auto`           | `auto`                          |
| `true`          | `sesh` or `herdr`          | matching explicit mode          |
| `false`         | absent                     | `none`                          |

`launch: false` plus any legacy launcher is rejected because one field cannot preserve both authored intents; choose canonical `launch: "none"` to remain disabled or the matching enabled mode. Equal camel/snake aliases collapse and produce one warning. Conflicting aliases, `none` plus a launcher, `auto` plus a legacy explicit launcher, and opposite explicit launchers are rejected with scope-qualified, actionable alternatives before mutation. Unsupported create `launch` values and non-boolean create `switch` values are also rejected before repository discovery or mutation. A canonical explicit mode may coexist with legacy `auto` or the matching explicit mode during migration, but the redundant legacy field still warns and should be removed.

### Legacy switch-default migration

Canonical switch examples must use only `defaults.switch.mode`. During the bounded compatibility window, Arashi still reads legacy `launchMode` and `launch_mode`, emits one migration warning with the exact replacement mode for accepted configuration, and keeps diagnostics out of JSON stdout.

Map legacy values as follows:

- absent or `launch` mode plus legacy `auto` becomes unified `launch`; a legacy `sesh` or `herdr` becomes the matching unified explicit mode.
- legacy `auto` plus no launcher or legacy `auto` remains unified `auto`; legacy `auto` plus `sesh` or `herdr` becomes that explicit mode.
- legacy `cd` plus no launcher or legacy `auto` remains unified `cd`.
- unified `sesh` or `herdr` plus legacy `auto` or the same explicit launcher keeps the unified mode.
- equal `launchMode` and `launch_mode` aliases collapse to one value and produce one warning when accepted; differing aliases are rejected with both fields and values named.

Arashi rejects `cd` plus `sesh` or `herdr`, and rejects opposite explicit launcher values, because one unified mode cannot preserve both intents. The actionable migration error names the conflicting fields and tells the user to choose either `mode: "cd"` or the matching explicit unified mode. Do not resolve these combinations silently.

### cmux troubleshooting and agent safety

- Do not invent or export `CMUX_WORKSPACE_ID` / `CMUX_SURFACE_ID` to force cmux behavior; run from an actual cmux-managed terminal.
- Do not treat `CMUX_SOCKET_PATH` alone as proof of an active cmux terminal.
- Verify the required CLI contract with `cmux workspace create --help`; update to cmux v0.64.18 or newer if the namespaced command, `--cwd`, `--focus`, or `--json` is unavailable.
- If cmux reports socket access failure, check that access is not **Off**. The default **cmux processes only** mode is sufficient for an Arashi process launched inside cmux.
- Treat `LAUNCH_FAILED` as a real failed launch. Do not retry by opening Ghostty manually unless the user asks for a different terminal.
- For unattended agent workflows, continue to use `--no-launch --no-switch`; automatic cmux launching is interactive user-facing behavior.
- Canonical workflow reference: `https://arashi.haphazard.dev/workflows/cmux/`.

### Herdr launch contract and safety

- `switch --herdr` opens or focuses the selected existing worktree. `create --herdr` creates worktrees first and then opens the primary worktree; launch failure preserves every successful Git creation.
- Configure switch with `defaults.switch.mode: "herdr"`; configure generic or matching editor-scoped create with `launch: "herdr"`. `--ignore-configured-launcher` bypasses configured switch Herdr for one invocation; `--no-launch` suppresses configured create launch.
- Arashi resolves the repository's absolute non-bare main checkout for Herdr `--cwd`. Do not substitute a linked worktree or a bare repository; a missing source fails actionably without another launcher.
- The approved argv contract is `herdr worktree open --cwd <source-checkout> --path <existing-worktree> --label '<repo-name>: <branch-name>' --focus --json`. Paths and labels are separate process arguments, not shell-interpolated text.
- This default workspace-launch contract is distinct from `--tab --herdr`: tab disposition uses `herdr tab create` in the active workspace, requires a non-empty exact `HERDR_WORKSPACE_ID`, and does not resolve or require the non-bare source checkout used by `herdr worktree open`.
- A first open and an already-open response are both successful when Herdr returns a validated `worktree_opened` result with a workspace ID. Repeated launch focuses the existing workspace and reapplies the deterministic label.
- Arashi owns Git worktree creation and removal. Never substitute `herdr worktree create`, `herdr worktree remove`, or `herdr workspace create`.
- `arashi remove` intentionally leaves Herdr workspaces untouched. For opt-in cleanup, resolve the workspace ID before removal and use `herdr workspace close <workspace-id>` in a pre-remove hook; automatic closure is unsafe because the workspace may contain agents or unsaved terminal state.
- Canonical workflow reference: `https://arashi.haphazard.dev/workflows/herdr/`.

## Remove Cleanup Hooks

Use [Hooks](hooks.md) for remove lifecycle hook setup and safety guidance.

## Remove Dry-Run Preview

Use `arashi remove --dry-run` before destructive cleanup when you need to confirm what will be removed or deleted:

```bash
# human-readable non-mutating preview
arashi remove feature-auth --dry-run

# machine-readable non-mutating preview for agents/scripts
arashi remove feature-auth --dry-run --json
```

Expected outcomes:

- command exits `0` after producing a removal plan
- no worktree directories are removed
- no local branches are deleted
- confirmation prompts are skipped because dry-run is non-mutating
- `pre-remove` and `post-remove` hooks are discovered/reported but not executed
- JSON output includes `data.dryRun: true`, pending `operations`, `effectiveOptions`, dirty-worktree `blockers`, skipped main worktrees, missing branches, and hook previews

For agent workflows, prefer a dry-run preview before `arashi remove <branch> --force --json` unless the target was just created and is known disposable. Do not treat `--dry-run` as cleanup; run the real remove command only after confirming the plan matches the intended branch/worktrees.

## Stale Worktree Metadata Cleanup

Prefer `arashi doctor --json` first when diagnosing stale worktree or repository health symptoms; use `arashi prune --dry-run --json` only after doctor reports or you already know prunable metadata is the issue.

Use `arashi prune` when Git reports prunable worktree metadata, usually after a worktree directory was removed manually or a Git worktree record points at a missing path.

```bash
# inspect stale metadata without changing Git records
arashi prune --dry-run --json

# clean stale metadata across the workspace
arashi prune --json
```

Expected outcomes:

- `arashi prune --dry-run` reports prunable entries and reasons without mutating Git metadata.
- `arashi prune` cleans stale Git worktree records in the main repository and configured child repositories.
- `arashi remove` excludes prunable records and points users to `arashi prune`; do not use `remove` for already-missing worktrees.

## Session Navigation (Optional)

For tmux/sesh and worktree jump shortcuts, use [Session Shortcuts](session-shortcuts.md).

## Publication and Discoverability

Publication is optional and policy-dependent.

```bash
git tag -a skill-arashi-v0.1.0 -m "arashi skill package v0.1.0"
git push origin skill-arashi-v0.1.0
```

After release, validate that installation and workflow instructions remain accurate for new users.
