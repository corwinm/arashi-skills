# Command Reference

Canonical commands for installing and using the Arashi CLI.

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

## Workflow Execution

Choose one workflow from `references/workflows.md`.

Order of operations:

1. Confirm `arashi --version` succeeds.
2. Execute one workflow from start to finish.
3. Confirm expected outcomes from the workflow doc.

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

Expected outcomes:

- `.arashi/config.json` includes `reposDir` and `worktreesDir`.
- default `worktreesDir` is `.arashi/worktrees` when the option is omitted.
- bootstrap mode accepts only `.` or a direct child directory name.
- `.gitignore` always includes the configured repositories directory.
- `.gitignore` auto-includes the normalized managed worktree directory entry when using the default location or a safe repository-relative subdirectory.
- `.gitignore` skips auto-adding worktree entries for `.` and parent-traversal (`../`) `worktreesDir` values.

## Repository Cloning and Recovery

Use `arashi clone` to clone configured repositories that are missing locally.

```bash
# interactively choose missing repositories
arashi clone

# clone all missing repositories
arashi clone --all
```

Expected outcomes:

- command exits `0` when clone operations succeed
- already-present repositories are skipped
- `arashi status` no longer reports missing repository spawn errors

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

Use one-off CLI overrides when needed:

```bash
arashi create feature-auth --launch
arashi create feature-auth --no-launch
arashi create feature-auth --no-switch
```

Use `arashi shell install` to enable parent-shell switching for bash, zsh, or fish, or `arashi shell init <shell>` for manual setup.

Precedence for create/switch launch behavior is: explicit flag > opt-out flag > config default > built-in default.
For `switch`, IDE-integrated terminals also prefer the matching IDE launcher when no explicit override is provided.

## Remove Cleanup Hooks

Use remove lifecycle hooks to automate teardown around `arashi remove`.

```bash
# workspace-root hooks
cp .arashi/hooks/pre-remove.sh.example .arashi/hooks/pre-remove.sh

# optional post-remove finalizer
cp .arashi/hooks/post-remove.sh.example .arashi/hooks/post-remove.sh

# repo-scoped hook (runs for one child repo)
mkdir -p repos/<repo>/.arashi/hooks
cp .arashi/hooks/pre-remove.sh.example repos/<repo>/.arashi/hooks/pre-remove.sh

# global shared hook (all repos)
mkdir -p ~/.arashi/hooks
cp .arashi/hooks/pre-remove.sh.example ~/.arashi/hooks/pre-remove.sh

# global repo-targeted hook
mkdir -p ~/.arashi/hooks/<repo>
cp .arashi/hooks/pre-remove.sh.example ~/.arashi/hooks/<repo>/pre-remove.sh
```

Before enabling hooks, review script contents and ensure commands are safe for their scope.
Only use hook scripts from trusted repositories and verify file provenance before making scripts executable.

For each targeted repository, remove hooks run in order:

1. `repos/<repo>/.arashi/hooks/<lifecycle>.sh`
2. `.arashi/hooks/<lifecycle>.sh`
3. `~/.arashi/hooks/<repo>/<lifecycle>.sh`
4. `~/.arashi/hooks/<lifecycle>.sh`

`pre-remove.sh` runs before destructive remove actions and can abort the command when it exits non-zero.
`post-remove.sh` runs after remove actions are attempted and can perform final cleanup (for example tmux/session teardown).

## Session Navigation (Optional)

For tmux/sesh and worktree jump shortcuts, use:

- `references/session-shortcuts.md`

## Publication and Discoverability

Publication is optional and policy-dependent.

```bash
git tag -a skill-arashi-v0.1.0 -m "arashi skill package v0.1.0"
git push origin skill-arashi-v0.1.0
```

After release, validate that installation and workflow instructions remain accurate for new users.
