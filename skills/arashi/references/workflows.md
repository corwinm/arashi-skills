# Workflow Catalog

Use this catalog to choose the right workflow by goal and confidence level.

| Workflow | Difficulty | User Goal |
|----------|------------|-----------|
| Standalone | Beginner | Manage worktrees for one existing repository without persisted Arashi configuration |
| Beginner | Beginner | Initialize a workspace and inspect current status |
| Intermediate | Intermediate | Clone missing repositories and create a feature branch across worktrees |
| Advanced | Advanced | Recover from branch drift and synchronize repositories safely |

## Command Shape by Workflow

- Beginner: `arashi init` -> `arashi status`
- Intermediate: `arashi clone --all` -> `arashi create` -> `arashi switch`
- Advanced: `arashi pull` -> `arashi sync` -> `arashi status` -> `arashi push --set-upstream`
- Ad hoc in an unconfigured project: `arashi init --zero-config` -> `arashi create <branch>` -> `arashi list` -> `arashi status`
- Agent inspection/validation/handoff: `arashi doctor --json` -> `arashi status` -> `arashi exec -- git status --short` -> `arashi exec --group <group> -- <validation-command>` or `arashi exec --only <repo> -- <validation-command>` -> `arashi handoff --link <issue-or-pr> --validation "<command> — <result>"`

## Selection Guidance

- Start with **Standalone** for one normal non-bare repository when child-repository coordination or persisted customization is not needed.
- Start with **Beginner** configured mode when the workflow needs child repositories, groups, hooks, defaults, custom managed paths, or coordinated commands.
- Choose **Intermediate** if you already have repositories and need cross-repo branch creation.
- Choose **Advanced** if you need sync and recovery controls.
- Use `arashi exec` for repeated non-interactive inspection or validation across managed repositories, especially agent handoff checks.
- Use `arashi handoff` before pausing non-trivial work, switching agents, requesting review, or leaving dirty coordinated work; include links, validation evidence, remaining tasks, risks, and next commands explicitly.
- For mutating, expensive, network-heavy, or long-running multi-repo commands, use explicit filters instead of relying on the default all-repository selection. Prefer `--group <group>` for known semantic sets such as `core`, `docs`, `extensions`, `agents`, or `infra`; use `--only <repo>` or a narrow comma-separated list for one-off selections.
- When both `--group` and `--only` are supplied, Arashi intersects them, so the group narrows the explicit repository list.
- If you automate teardown on branch removal, use [Hooks](hooks.md).
- If you use tmux/sesh, apply shortcuts from [Session Shortcuts](session-shortcuts.md).
- For Herdr workspace launch, reuse, ownership boundaries, and cleanup guidance, see `https://arashi.haphazard.dev/workflows/herdr/` and [Session Shortcuts](session-shortcuts.md).
- For the latest hooks docs, see `https://arashi.haphazard.dev/workflows/hooks/`.
- For command defaults and shell-aware switching behavior, see `https://arashi.haphazard.dev/workflows/config/`.
- For VS Code and VS Code-based editor workflows, see `https://arashi.haphazard.dev/workflows/vscode/`.
- For cmux workspace launching, requirements, and troubleshooting, see `https://arashi.haphazard.dev/workflows/cmux/`.
- For tmux and sesh workflows, see `https://arashi.haphazard.dev/workflows/tmux-and-sesh/`.
- For agent guidance in a meta-repo, see `https://arashi.haphazard.dev/workflows/agents-and-specs/` or fetch the Markdown form at `https://arashi.haphazard.dev/workflows/agents-and-specs.md`.
- For compact agent context across the docs, start with `https://arashi.haphazard.dev/llms.txt`; use `https://arashi.haphazard.dev/llms-full.txt` for a broader Markdown export.

## Workflow Entry Guidance

Assume Arashi is available unless the user is installing it or a command is not working as expected.

When a workflow needs command-specific options, inspect `arashi <command> --help` before recommending or running flags. If your team enforces repository security checks, run them before executing workflows.

When operating as an agent in a meta-repo, start with `arashi doctor --json` for structured workspace health diagnostics, then use `arashi status` for human-readable status as needed. Identify the owning child repository, keep implementation in `repos/<project>/`, keep shared planning in the meta-repo, and validate each affected repo before handoff. Use `arashi exec -- git status --short` for broad inspection, `arashi exec --dirty -- git diff --stat` for changed repositories, `arashi exec --group <group> -- <validation-command>` for known semantic sets, and `arashi exec --only <repo> -- <validation-command>` for targeted one-off validation. Before pausing or transferring context, run `arashi handoff` with supplied `--link`, `--validation`, `--todo`, `--risk`, and `--next-command` entries; use `--json` when another agent or script will parse the report.

Expect configured initialization and configuration-backed lifecycle commands (`init`, `pull`, `clone`, `add`, and `create`) to reconcile safe configured repository and worktree directory rules before materialization. Preserve effective rules reported by Git, default missing rules to repository-local excludes, and never change global Git configuration. Use `arashi init --ignore-scope tracked` only for an intentional shared `.gitignore` rule, `--ignore-scope none` only for intentional non-mutation, and `--ignore-scope local` to restore the clone-local default. Non-bare configured init defaults to `.arashi/worktrees`; canonical bare configured init defaults to `..`. An explicit `--worktrees-dir` overrides either default. Later commands use the persisted config value rather than re-inferring repository type. Bare init reports the parent default as external and unsafe and bare-root subdirectories as non-applicable; under local, tracked, or none it reports the selected scope without `git check-ignore` or ignore-file writes. `init` reconciles or reports managed paths before writing `.arashi/config.json`; subsequent lifecycle commands consume that file. Standalone bootstrap instead owns only the literal `.worktrees/` local-exclude rule and never writes configuration.

## Standalone Repository Workflow

Prefer configured mode whenever a project can adopt Arashi—even for one repository—because it enables repository/workspace hooks, persisted defaults, and custom paths. Use zero-config standalone mode for ad hoc work in an existing non-bare Git project that has not adopted Arashi configuration. From either the main worktree or a linked worktree, Arashi resolves the main worktree as the workspace and repository root. The root-level `.worktrees/` directory is the discovery trigger; passive discovery does not create it or repair ignore state.

Preferred explicit bootstrap:

```bash
arashi init --zero-config
```

This creates the main-root `.worktrees/` directory and, only when needed, appends the literal `.worktrees/` rule to the common repository's `info/exclude`. It does not create `.arashi/`, edit tracked `.gitignore`, or create or modify global Git configuration.

Run the supported lifecycle:

```bash
branch=feature/skill-integration
destination=".worktrees/$branch"
git check-ignore --no-index -q -- "$destination" || {
  printf 'error: %s is not effectively ignored\n' "$destination" >&2
  exit 1
}
arashi create feature/skill-integration --no-launch --no-switch
arashi list
arashi status
arashi switch feature/skill-integration
arashi remove feature/skill-integration --dry-run
arashi remove feature/skill-integration
```

Standalone worktrees use `.worktrees/<branch>` exactly, so `feature/skill-integration` maps to `.worktrees/feature/skill-integration` without a repository-name prefix. Before any create mutation, including dry-run planning, Arashi requires the exact planned destination to be effectively ignored.

Standalone mode also supports `arashi prune`, `arashi doctor`, `arashi move`, and `arashi handoff`. Main-worktree and linked-worktree invocations operate on the same sole repository. Repository coordination remains configured-only: use ordinary `arashi init` before `add`, `clone`, `sync`, `pull`, `push`, `exec`, or `setup`. Repository/group selection such as `create --only`, `create --group`, `status --group`, interactive multi-repository selection, and `switch --repos` or `switch --all` is meaningless in standalone mode and fails rather than silently broadening or narrowing scope.

Upgrade at any time with ordinary `arashi init` when child coordination, groups, local/workspace hooks, persisted defaults, or custom managed paths are needed. Existing `.worktrees/` and local exclude state are ordinary Git state; review the configured initialization plan before adopting a different worktree layout.

## Beginner Workflow

Run `arashi init` from one of two valid starting points:

- inside an existing repository root you want to manage
- inside a non-repository parent directory, then enter `.` or a child repository name when prompted

```bash
arashi init
arashi status
```

Expected outcomes:

- `.arashi/config.json` exists after `arashi init`.
- `.arashi/config.json` records the repository-aware or explicit normalized `worktreesDir`.
- omitted `--worktrees-dir` uses `.arashi/worktrees` for a non-bare repository and `..` for a canonical bare repository; an explicit option wins, and the persisted value remains authoritative afterward.
- bootstrap mode accepts `.` for the current directory and a direct child repository name for child-directory creation.
- in non-bare repositories, Git checks safe configured `reposDir` and `worktreesDir` paths against all effective ignore sources.
- missing safe rules default to the repository-local exclude file; tracked `.gitignore` changes only after explicit `--ignore-scope tracked` selection.
- existing effective tracked, local, or global rules remain unchanged and are not duplicated.
- bare init does not inspect or write worktree ignore files: it reports parent traversal as external/unsafe and bare-root administrative paths as non-applicable for local, tracked, and none scopes.
- `arashi status` prints repository/worktree status without errors.

## Intermediate Workflow

```bash
arashi clone --all
arashi create feature/skill-integration
arashi switch feature/skill-integration
```

Expected outcomes:

- Ignore reconciliation completes before missing configured repositories or worktrees are materialized.
- Missing configured repositories are materialized locally.
- New worktrees exist for `feature/skill-integration`.
- `arashi switch` opens the selected worktree in a new terminal context.
- Use `arashi switch --help` to confirm current editor launch flags before choosing an IDE-specific switch option.

## Optional Herdr Workspace Launch

Use this flow when Herdr is installed with the verified v0.7.4 command contract and its default session/server is reachable:

```bash
arashi switch --herdr feature/skill-integration
# or create first and launch the primary worktree afterward
arashi create feature/skill-integration --herdr
```

Configured `defaults.switch.mode: "herdr"` selects the same launcher outside a Herdr pane. Automatic launcher selection checks tmux → Herdr → cmux → integrated IDE → Kitty before terminal/platform fallback. Contextual `defaults.switch.mode: "auto"` uses parent-shell `cd` only after those managed contexts and before fallback; `mode: "launch"` skips the `cd` preference. Arashi resolves the repository's non-bare main checkout as the Herdr source, opens only the existing selected worktree, labels it `<repo-name>: <branch-name>`, and treats an already-open workspace as successful reuse.

Arashi alone owns Git worktree creation and removal. A Herdr launch failure after `create` leaves every successfully created worktree intact, and `arashi remove` does not close Herdr workspaces. If cleanup is desired, resolve the workspace ID while the checkout still exists and opt into a pre-remove hook that runs `herdr workspace close <workspace-id>`; never use `herdr worktree remove` as Arashi cleanup.

## Automatic Managed Kitty Sessions

Inside a positively detected Kitty terminal, automatic `arashi switch` and post-create launch use the same managed Kitty flow after higher-precedence tmux, Herdr, cmux, and integrated IDE contexts. Kitty 0.43+ and permitted remote control are prerequisites. Arashi derives a collision-resistant stable identity from the canonical worktree path, keeps a separate readable `<repo-name>: <branch-name>` session label, and focuses the one live window with the exact Arashi-managed marker and canonical cwd. It creates a session-backed tab only when no exact match exists.

Managed Kitty is auto-detected only: there is no explicit Kitty launcher or persisted Kitty launch mode. Once selected, an unsupported version, denied remote control, malformed state, duplicate exact matches, focus failure, or launch failure fails closed with `LAUNCH_FAILED`; do not retry a generic terminal or close a window to force success. A post-create launch failure preserves every successfully created worktree and reports creation separately from launch failure.

Arashi's Kitty integration is live-only. It does not create or modify `.kitty-session` files, restore sessions after Kitty exits, or perform automatic window cleanup. `arashi remove` does not close Kitty windows or sessions; close them manually in Kitty when desired.

## Advanced Workflow

```bash
arashi pull
arashi sync
arashi status
arashi push --set-upstream
```

Expected outcomes:

- Remotes are fetched and local branches update where possible.
- If the selected parent pull changes configured managed paths, Arashi reloads configuration and reconciles those paths before continuing selected child pulls.
- Sync avoids partial update states.
- `arashi status` reports clean or actionable next steps.
- Eligible changed repositories are published before PR creation; untouched child repositories are skipped instead of getting manufactured remote branches.

After completion, confirm the expected outcomes listed for that workflow before moving to another one.
