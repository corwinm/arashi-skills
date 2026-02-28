# Session Shortcuts (fzf, tmux, sesh)

Use these optional shortcuts to move quickly between Arashi worktrees.

## Prerequisites

- `arashi` installed and on `PATH`
- `fzf` installed for interactive selection
- `sesh` installed for tmux session management (optional)

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

```bash
arashi switch
arashi switch --repos docs
arashi switch --all
arashi switch --no-default-launch
```

## Connect with sesh

```bash
arashi switch --sesh
```

## Optional Keybinds

If you create shell keybinds, prefer wrappers that validate selected paths before changing directories.
Avoid command-substitution keybinds that execute unsanitized output directly.

## Expected Outcomes

- selection flow changes shell to the selected worktree path.
- `arashi switch` opens a terminal context for a selected worktree.
- `arashi switch --sesh` creates or switches via sesh in tmux.
- `arashi switch --no-default-launch` bypasses configured switch launch defaults for one run.
