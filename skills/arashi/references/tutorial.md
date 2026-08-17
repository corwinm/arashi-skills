# End-to-End Tutorial

Complete one configured Arashi workflow, verify it, then load optional guidance only if the task needs it.

## Choose a mode

Use **configured mode** for persisted defaults, custom paths, child repositories, groups, hooks, or coordinated commands. This tutorial follows that path.

Use **zero-config standalone mode** only for ad hoc work in an unconfigured non-bare Git project. Preview with `arashi init --zero-config --dry-run`, then follow [Workspace and repositories](commands/workspace.md). Standalone mode does not create `.arashi` configuration and supports a smaller command surface.

## Preflight

Assume the CLI is installed. Verify only if the command is unavailable or installation was requested:

```bash
arashi --version
arashi --help
```

If verification fails, use [Prerequisites](prerequisites.md) and the current installation instructions at https://arashi.haphazard.dev. Node.js and network access are conditional on the chosen installation/update path; they are not requirements for every local invocation.

From the intended configured workspace root, initialize before diagnostics only when `.arashi/config.json` is absent:

```bash
# run only when configuration is absent
arashi init

# diagnose the initialized workspace before mutation
arashi doctor --json
```

Resolve reported configuration or Git-state failures before continuing.

## Configured happy path

Continue from the initialized workspace root:

```bash
# inspect before broad work
arashi status

# create one coordinated target without user-facing launch
arashi create feature/skill-integration --no-launch --no-switch

# verify selected worktrees
arashi status
```

If the workspace contains many repositories, apply the same `--group` or `--only` selector during inspection, creation, and validation. Do not let a final mutating command widen beyond the set that was reviewed.

Use the paths reported by `arashi status` to enter the created worktrees and run each project's existing validation there. Use `arashi exec` only when child repositories are already configured, and reuse the same real `--group` or `--only` selector that was inspected earlier; do not invent an example repository name.

Exact init/create semantics are in [Workspace and repositories](commands/workspace.md) and [Create worktrees](commands/create.md). Installed `arashi <command> --help` is the option authority.

## Verify the result

The tutorial succeeds when:

- each selected repository has the expected created or explicitly reused worktree;
- unselected repositories were untouched;
- original uncommitted changes remain where they started unless `arashi move` was deliberately used;
- `arashi status` reports the intended branch/worktree state; and
- the relevant repository validation exits successfully.

If creation partially succeeded but launch failed, preserve the created worktrees and diagnose the requested launcher rather than retrying with an unrelated fallback.

## Optional next steps

Load only the reference needed:

- Shell wrapper or completion: [Setup, update, and completion](commands/setup.md)
- Coordinated pull, push, groups, JSON, or handoff: [Automation and coordinated execution](commands/automation.md)
- Interactive selection, tmux, sesh, Herdr, Kitty, editor, or tab launch: [Switch and launch](commands/switch-and-launch.md)
- Navigation composition: [Session shortcuts](session-shortcuts.md)
- Lifecycle policy: [Hooks](hooks.md)
- Removal or stale metadata: [Remove and maintenance](commands/remove-and-maintenance.md)
- Symptoms and recovery: [Troubleshooting](troubleshooting.md)

Optional setup is not part of the successful configured journey. Review launcher, shell, and hook security boundaries before enabling those integrations.
