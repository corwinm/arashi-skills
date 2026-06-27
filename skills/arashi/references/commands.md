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

Use JSON mode for automation-relevant commands including `add`, `clone`, `create`, `init`, `list`, `pull`, `remove`, `setup`, `status`, `sync`, and `update`.

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

Use one-off CLI overrides when you want a single `arashi create` run to differ from configured defaults, such as launching immediately or skipping the post-create switch. Common examples include:

```bash
arashi create feature-auth --launch
arashi create feature-auth --no-launch
arashi create feature-auth --no-switch
```

Use `arashi shell install` to enable parent-shell switching for bash, zsh, or fish, or `arashi shell init <shell>` for manual setup.

Precedence for create/switch launch behavior is: explicit flag > opt-out flag > config default > built-in default.
For `switch`, IDE-integrated terminals also prefer the matching IDE launcher when no explicit override is provided.

## Remove Cleanup Hooks

Use [Hooks](hooks.md) for remove lifecycle hook setup and safety guidance.

## Session Navigation (Optional)

For tmux/sesh and worktree jump shortcuts, use [Session Shortcuts](session-shortcuts.md).

## Publication and Discoverability

Publication is optional and policy-dependent.

```bash
git tag -a skill-arashi-v0.1.0 -m "arashi skill package v0.1.0"
git push origin skill-arashi-v0.1.0
```

After release, validate that installation and workflow instructions remain accurate for new users.
