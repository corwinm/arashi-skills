# Remove Lifecycle Hooks

Use remove lifecycle hooks to automate trusted cleanup around `arashi remove`.

For the latest workflow guidance, see https://arashi.haphazard.dev/workflows/hooks/.

## Setup Examples

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

## Safety Guidance

Before enabling hooks, review script contents and ensure commands are safe for their scope.
Only use hook scripts from trusted repositories and verify file provenance before making scripts executable.

## Standalone Mode

Prefer configured mode when a project can adopt Arashi and needs repository-local or workspace-root hooks. Zero-config standalone mode is for ad hoc use and does not create or activate those `.arashi/hooks` scopes; existing user-global hooks remain applicable:

1. `~/.arashi/hooks/<main-root-basename>/<lifecycle>.sh`
2. `~/.arashi/hooks/<lifecycle>.sh`

Arashi uses the main-root basename as the stable targeted identity and runs applicable user-global hooks with the main repository as the working directory, whether invoked from the main worktree or a linked worktree. Existing pre-operation gating, post-operation finalization, failure reporting, and rollback behavior still apply. Do not create local configured hooks as part of zero-config bootstrap; use ordinary `arashi init` before adding those scopes.

## Configured Mode Hook Order

For each targeted repository, remove hooks run in order:

1. `repos/<repo>/.arashi/hooks/<lifecycle>.sh`
2. `.arashi/hooks/<lifecycle>.sh`
3. `~/.arashi/hooks/<repo>/<lifecycle>.sh`
4. `~/.arashi/hooks/<lifecycle>.sh`

`pre-remove.sh` runs before destructive remove actions and can abort the command when it exits non-zero.
`post-remove.sh` runs after remove actions are attempted and can perform final cleanup, such as tmux or session teardown.
