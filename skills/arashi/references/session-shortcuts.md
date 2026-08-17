# Session Shortcuts

Compose navigation around Arashi; do not duplicate command semantics here. See [Switch and launch](commands/switch-and-launch.md) for precedence, launch capability, JSON refusal, and failure behavior.

## Prerequisites

Shortcuts are optional:

- `fzf` for fuzzy selection
- tmux for `--tmux` or sesh-managed tmux navigation
- `sesh` for `--sesh`
- the selected editor, Herdr, or other launcher only when explicitly requested

Verify the integration you intend to use rather than requiring every optional tool.

## Safe selection

Inspect before opening a target:

```bash
arashi list
arashi status
```

When duplicate branch names exist, prefer an exact path. Do not build a shortcut that converts untrusted labels or paths into shell source.

## Arashi-managed launch

Use one explicit mode per shortcut:

```bash
# canonical automatic selection
arashi switch feature-auth

# force automatic launch while preserving a configured explicit launcher
arashi switch --launch feature-auth

# bypass configured sesh/Herdr without independently forcing launch
arashi switch --ignore-configured-launcher feature-auth

# force generic automatic launch
arashi switch --launch --ignore-configured-launcher feature-auth
```

The detailed resolver and no-fallback policy live in [Switch and launch](commands/switch-and-launch.md).

## tmux and sesh

```bash
# explicit plain tmux for one switch
arashi switch --tmux feature-auth

# create and launch the primary target in tmux
arashi create feature-auth --tmux

# use sesh inside tmux
arashi switch --sesh
```

`--tmux` is per-invocation. It requires an active tmux client or session: `TMUX` must be non-empty after trimming. Missing context or process failure does not fall back to another launcher. Use `--sesh` only when sesh is installed and the invocation is eligible.

## Fuzzy picker composition

Keep the picker and execution separate so the selected path remains data:

```bash
# Step 1: select and review the printed path; do not execute it as shell text.
arashi list | fzf

# Step 2: copy the reviewed exact path into a separate quoted command.
arashi switch --path "/exact/reviewed/worktree/path"
```

Default `arashi list` output is the pipe-friendly path surface, so this composition requires only the conditional `fzf` integration. Keep selection and execution separate, quote the reviewed path, and never evaluate it as shell code.

## Completion criteria

A shortcut succeeds when it selects the intended exact worktree, invokes one documented Arashi mode, and either opens/focuses that target or returns an actionable failure without trying another launcher. It must not mutate Git state, rewrite user launcher configuration, or persist one-shot launch flags.
