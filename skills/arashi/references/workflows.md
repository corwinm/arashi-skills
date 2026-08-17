# Workflow Catalog

Choose the goal first, then open the linked command family for syntax and precedence. Installed help remains authoritative.

## Configured workflow

Prefer configured mode whenever the project needs persisted defaults, custom paths, child repositories, groups, hooks, or coordinated commands. Use ordinary `arashi init`; a single-repository project may still benefit from configuration.

1. Initialize only when configuration is absent:

   ```bash
   arashi init
   ```

2. Diagnose the initialized workspace before changing state:

   ```bash
   arashi doctor --json
   arashi status
   ```

3. Inspect the effective repository set. Apply `--group` or `--only` before a mutating, expensive, network-heavy, or long-running command unless every managed repository was explicitly requested.
4. Create one coordinated branch without user-facing launch during unattended work:

   ```bash
   arashi create feature/skill-integration --no-launch --no-switch
   ```

5. Verify the resulting worktrees with `arashi status`, then use the paths reported by `arashi status` to run project-local validation. When configured child repositories exist, `arashi exec` may run repeated non-interactive validation with the same selector scope.

Completion means the expected configured worktree exists in each selected repository, the original worktree changes were preserved or deliberately moved, and status/validation succeeds. See [Workspace commands](commands/workspace.md), [Create commands](commands/create.md), and [Automation commands](commands/automation.md).

## Standalone Repository Workflow

Use standalone mode only for ad hoc work in an unconfigured non-bare Git project. It does not create or persist `.arashi` configuration.

1. Confirm whether the current checkout is the main worktree or a linked worktree.
2. Preview the exact destination and ignore status:

   ```bash
   arashi init --zero-config --dry-run
   ```

3. Bootstrap only after the plan is acceptable:

   ```bash
   arashi init --zero-config
   ```

4. Create and inspect the ad hoc worktree:

   ```bash
   arashi create feature/skill-integration --no-launch --no-switch
   arashi status
   ```

Standalone worktrees use the discovered `.worktrees/<branch>` layout. Passive discovery does not repair ignore coverage. When the convention is not already ignored, bootstrap appends the literal `.worktrees/` rule to the repository-local exclude, covering the whole directory rather than one planned branch destination; it must not edit tracked `.gitignore` or global Git configuration automatically.

Configured-only repository coordination such as child `add`, `clone`, `pull`, `push`, `sync`, and `exec` remains unavailable. Adopt ordinary `arashi init` when those capabilities, groups, custom paths, or local hooks are required. Full boundaries and recovery are owned by [Workspace commands](commands/workspace.md).

## Inspect or update selected repositories

Use [Automation commands](commands/automation.md) for selector normalization, groups, JSON envelopes, handoffs, and coordinated push behavior.

```bash
arashi status --only docs,api
arashi exec --group docs -- git status --short
arashi pull --group docs
arashi push --group docs --dry-run
```

For broad mutation, preview when supported and preserve the identical selectors from inspection through execution. Completion means each selected repository has an explicit success, skip, or actionable failure outcome; an unselected repository is untouched.

## Create from a coordinated base

Use [Create commands](commands/create.md) when a follow-up branch must start from the same base in the effective selected set.

```bash
arashi create feature/docs --base feature/platform --group docs --no-launch --no-switch
```

Resolve the base everywhere before mutation. Reused targets remain unchanged and are not claimed to descend from the requested base. If compatible work began in the wrong workspace, use the documented `arashi move` recovery only after the target exists and is clean.

## Switch or launch interactively

For a human-facing selection, start with:

```bash
arashi switch feature/skill-integration
```

The primary behavior owner is [Switch and launch](commands/switch-and-launch.md). It covers configured mode, one-shot overrides, tmux, sesh, Herdr, cmux, managed Kitty, editor launch, tab disposition, prerequisites, and no-fallback failures.

Inside a positively detected Kitty terminal, automatic switch and post-create launch use the same managed flow after higher-precedence tmux, Herdr, cmux, and integrated IDE contexts. Kitty 0.43+ and permitted remote control are prerequisites. Arashi derives a stable identity from the canonical worktree path, keeps a readable session label, and focuses the one live window with the exact Arashi-managed marker and canonical cwd. It creates a session-backed tab only when no exact match exists.

Managed Kitty is auto-detected only. Failure reports `LAUNCH_FAILED`, does not fall back, and preserves every successfully created worktree. The integration is live-only: it does not create or modify `.kitty-session` files, restore sessions, or clean up automatically. `arashi remove` does not close Kitty windows or sessions.

Use [Session shortcuts](session-shortcuts.md) only when composing navigation with fzf, tmux, or sesh. Session shortcuts do not replace command semantics.

## Remove or recover

Preview the exact scope first:

```bash
arashi remove feature/skill-integration --dry-run
```

Use [Remove and maintenance](commands/remove-and-maintenance.md) for remove/prune behavior and [Hooks](hooks.md) for lifecycle order. A failing pre-remove hook stops destructive mutation; post-remove reports cleanup after attempted removal. Do not prune or remove unrelated worktrees while recovering one target.

## Completion handoff

Before handing work to another user or agent:

1. Run `arashi status` or `arashi doctor --json`.
2. Use paths reported by `arashi status` for project-local validation. When configured child repositories exist, `arashi exec` may run repeated validation with the same inspected selector.
3. Record created/reused/skipped/failed repositories and any preserved worktrees.
4. Use `arashi handoff` when a structured workspace report is useful.

A workflow is complete only when its selected repository set, worktree outcome, validation state, and any required manual recovery are explicit.
