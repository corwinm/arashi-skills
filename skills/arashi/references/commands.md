# Command Reference

Canonical commands for installing and using the Arashi CLI.

## Most Common Commands

```bash
# install Arashi CLI (macOS/Linux)
curl -fsSL https://arashi.haphazard.dev/install | bash

# fallback install (all platforms)
npm install -g arashi

# verify Arashi CLI
arashi --version

# inspect command surface
arashi --help
```

## Installation

Install with curl script (official direct install on macOS/Linux):

```bash
curl -fsSL https://arashi.haphazard.dev/install | bash
```

Optional pinned install:

```bash
curl -fsSL https://arashi.haphazard.dev/install | ARASHI_VERSION=1.4.0 bash
```

Fallback install with npm (all platforms):

```bash
npm install -g arashi
```

Alternative manual install from GitHub Releases:

```bash
curl -L https://github.com/corwinm/arashi/releases/latest/download/arashi-macos-arm64 -o arashi
chmod +x arashi
sudo mv arashi /usr/local/bin/arashi
```

Expected outcome:

- install command exits `0`
- `arashi --version` returns a version string

## Workflow Execution

Choose one workflow from `references/workflows.md`.

Order of operations:

1. Confirm `arashi --version` succeeds.
2. Execute one workflow from start to finish.
3. Confirm expected outcomes from the workflow doc.

## Worktree Switching

Use `arashi switch` to open a terminal context for an existing worktree.

```bash
# parent workspace worktrees (default)
arashi switch

# child repositories in current workspace only
arashi switch --repos docs

# include parent workspaces + nested child repo worktrees
arashi switch --all

# sesh mode inside tmux
arashi switch --sesh
```

Expected outcomes:

- command exits `0` and opens the selected target in a new context
- `--repos` matches repository names first (exact match preferred)
- `--repos` with no matches lists available child repositories

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
