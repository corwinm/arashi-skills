# Session Shortcuts (fzf, tmux, sesh)

Use these optional shortcuts to move quickly between Arashi worktrees.

## Prerequisites

- `arashi` installed and on `PATH`
- `fzf` installed for interactive selection
- `sesh` installed for tmux session management (optional)

## Jump to a Worktree

```bash
cd "$(arashi list | fzf)"
```

## Connect with sesh

```bash
sesh connect "$(arashi list | fzf)"
```

## Optional Keybinds

Bash (Ctrl+G for jump, Ctrl+S for sesh):

```bash
bind '"\C-g":"cd \$(arashi list | fzf)\n"'
bind '"\C-s":"sesh connect \$(arashi list | fzf)\n"'
```

Zsh (Ctrl+G for jump, Ctrl+S for sesh):

```zsh
bindkey -s '^g' 'cd $(arashi list | fzf)\n'
bindkey -s '^s' 'sesh connect $(arashi list | fzf)\n'
```

## Expected Outcomes

- `cd` shortcut changes shell to the selected worktree path.
- `sesh connect` creates or switches to a matching tmux session.
