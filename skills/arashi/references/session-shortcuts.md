# Session Shortcuts (fzf, tmux, sesh, Herdr)

Use these optional shortcuts to move quickly between Arashi worktrees.

## Prerequisites

- `arashi` installed and on `PATH`
- `fzf` installed for interactive selection
- `sesh` installed for tmux session management (optional)
- Herdr installed with the verified v0.7.4 command contract and its default session/server reachable (optional)

## Safe Worktree Selection

List available paths and select one explicitly:

```bash
arashi list
cd -- "<selected-worktree-path>"
```

If you want an `fzf` helper, keep selection and execution as separate steps:

```bash
arashi list | fzf > /tmp/arashi-selected-worktree
read -r selected_worktree < /tmp/arashi-selected-worktree
cd -- "$selected_worktree"
```

This avoids inline command substitution and keeps quoting explicit.

## Switch with Arashi

Use `arashi shell --help` and `arashi switch --help` to confirm current shell and switch options. Common examples include:

```bash
arashi shell install
arashi switch
arashi switch --cd feature-auth
arashi switch --repos docs
arashi switch --all
arashi switch --cursor feature-auth
arashi switch --herdr feature-auth
arashi switch --no-cd
arashi switch --no-default-launch
```

## Connect with sesh

```bash
arashi switch --sesh
```

## Open or Reuse a Herdr Workspace

```bash
arashi switch --herdr feature-auth
arashi create feature-auth --herdr
```

`--herdr` explicitly selects Herdr even outside a Herdr-managed pane. Automatic contextual resolution follows tmux → Herdr → cmux → integrated IDE → parent-shell `cd` → terminal/platform fallback. Herdr is selected automatically only when trimmed `HERDR_ENV` is exactly `1` and tmux is not active. Herdr opens the existing Arashi-created worktree with the label `<repo-name>: <branch-name>` and focuses the same workspace when it is already open.

## Optional Keybinds

If you create shell keybinds, prefer wrappers that validate selected paths before changing directories.
Avoid command-substitution keybinds that execute unsanitized output directly.

## Expected Outcomes

- selection flow changes shell to the selected worktree path.
- `arashi switch` opens a terminal context for a selected worktree.
- `arashi switch --cd` changes the current shell directory when shell integration is active.
- `arashi switch --vscode|--cursor|--kiro` forces that IDE for one switch invocation.
- `arashi switch --sesh` creates or switches via sesh in tmux.
- `arashi switch --herdr` opens or focuses the selected existing worktree in Herdr.
- `arashi create <branch> --herdr` creates worktrees first, then opens the primary worktree in Herdr.
- if shell integration is inactive, explicit `arashi switch --cd` warns without launching another context; configured `mode: "cd"` warns and falls back to automatic launch.
- `arashi switch --no-cd` forces launch for one run and retains a configured explicit `sesh` or `herdr` mode.
- `arashi switch --no-default-launch` bypasses a configured explicit `sesh` or `herdr` mode for one run, but does not erase configured `auto`, `cd`, or `launch` behavior.
