# Command Reference

Common command patterns for installing and using the Arashi CLI.

## Most Common Commands

```bash
# verify Arashi CLI
arashi --version

# inspect command surface
arashi --help
```

## Installation

Installation instructions are maintained on the Arashi website:

- https://arashi.haphazard.dev

Use the website flow for your platform and environment policy.

Expected outcome:

- `arashi --version` exits `0`
- `arashi --help` exits `0`

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
    "arashi-vscode": { "path": "repos/arashi-vscode", "groups": ["extensions"] },
    "arashi-skills": { "path": "repos/arashi-skills", "groups": ["agents", "docs"] },
    "deploy": { "path": "repos/deploy", "groups": ["infra"] }
  }
}
```

Common group names include `core`, `docs`, `extensions`, `agents`, and `infra`. Use `--group <group>` on repo-selecting commands when a known semantic set matches the task better than enumerating repositories with `--only`.

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

Run `arashi init` from an existing repository root, or from a non-repository parent directory when you want Arashi to create the repository during setup.

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
- default `worktreesDir` is `.arashi/worktrees` when the option is omitted.
- bootstrap mode accepts only `.` or a direct child directory name.
- safe configured repository and worktree directories are checked against Git's effective tracked, repository-local, and global ignore sources before any write.
- with no explicit or stored preference, missing rules are added to the repository-local exclude file resolved by Git; tracked `.gitignore` is unchanged.
- `tracked` and `none` are stored in clone-local Git state, not shared `.arashi/config.json`; selecting `local` clears the non-default preference.
- `arashi init --ignore-scope local` can reset only the preference and reconcile an existing valid workspace without `--force` or reinitializing configuration, hooks, or repositories.
- existing effective rules are honored without duplication even when their source differs from the selected scope.
- repository root, absolute paths, and parent traversal are reported as unsafe and are never added automatically.
- Arashi never creates or modifies global Git configuration or a global excludes file.

## Managed Ignore Reconciliation

Configured initialization and configuration-backed lifecycle commands reconcile the safe normalized `reposDir` and `worktreesDir` rules before they materialize or continue work that depends on those paths. This applies to `init`, `pull`, `clone`, `add`, and `create`. A fresh clone with no stored preference defaults to the repository-local Git exclude file and does not unexpectedly dirty tracked `.gitignore`.

Command boundaries:

- `init` reconciles before creating managed directories and is the command that selects `local`, `tracked`, or `none` with `--ignore-scope`.
- `pull` uses the current configuration, and when the selected parent pull changes configuration, reloads it and reconciles the resulting paths before continuing with the re-evaluated child selection. It does not pull an excluded parent solely for reconciliation or implicitly clone a newly configured missing child.
- `clone` reconciles before creating a configured repository path.
- `add` reconciles before changing configuration and cloning into `reposDir`.
- `create` reconciles before creating parent or child worktrees.

Expected outcomes:

- Git's existing effective tracked, repository-local, or global rule wins; Arashi does not add a duplicate rule or rewrite user-authored content.
- `local` writes only Arashi-owned rules to the common repository's local exclude file; `tracked` writes only Arashi-owned rules to workspace-root `.gitignore`.
- `none` leaves ignore files untouched and warns about safe paths that remain unignored.
- repeated lifecycle commands are idempotent, and command rollback reports whether reconciliation was attempted, retained, restored, or could not be restored based on final filesystem state.
- human output explains warnings; JSON-capable modes keep stdout to one JSON document and place details under the command's managed-ignore result.
- after configured initialization, lifecycle commands use `.arashi/config.json`; `init` itself reconciles before writing that file. This contract does not implement the separate zero-config standalone behavior tracked by issue #212.

Run `arashi doctor --json` to inspect missing rules, stale Arashi-owned entries, invalid stored scope, or unsafe configured paths without mutation. Follow its suggested repair; use `arashi init --ignore-scope local` to restore the default when that is the intended preference. Do not repair Arashi by setting `core.excludesFile` or editing any global Git configuration.

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

# force launch behavior for one run
arashi switch --no-cd

# sesh mode inside tmux
arashi switch --sesh

# bypass configured switch launch defaults for one run
arashi switch --no-default-launch
```

Expected outcomes:

- command exits `0` and opens the selected target in a new context
- `arashi switch --cd` changes the current shell directory when invoked through the installed shell wrapper
- `--repos` matches repository names first (exact match preferred)
- `--repos` with no matches lists available child repositories
- `--path` matches one exact worktree path and skips fuzzy branch/path matching
- `--vscode`, `--cursor`, and `--kiro` override configured switch defaults for a single invocation
- when shell integration is inactive, `--cd` warns and falls back to launch behavior instead of failing solely because the parent shell cannot be changed directly
- compatible editor hosts can pass the matching switch flag automatically when running Arashi through the extension
- extension-driven switch selections use exact path mode so duplicate branch names do not create ambiguous CLI matches

## Create Defaults and Overrides

Use command defaults in `.arashi/config.json` to control post-create switch/launch behavior:

```json
{
  "defaults": {
    "create": {
      "switch": true,
      "launch": true,
      "launchMode": "sesh"
    },
    "switch": {
      "mode": "auto",
      "launchMode": "sesh"
    }
  }
}
```

Use one-off CLI overrides when you want a single `arashi create` run to differ from configured defaults, such as launching immediately or skipping the post-create switch. Common examples include:

```bash
arashi create feature-auth --launch
arashi create feature-auth --no-launch
arashi create feature-auth --no-switch
arashi create feature-auth --move-changes
```

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

Precedence for create/switch launch behavior is: explicit flag > opt-out flag > config default > built-in default.
For `switch`, IDE-integrated terminals also prefer the matching IDE launcher when no explicit override is provided.

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
