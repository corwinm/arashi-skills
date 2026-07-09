# Workflow Catalog

Use this catalog to choose the right workflow by goal and confidence level.

| Workflow | Difficulty | User Goal |
|----------|------------|-----------|
| Beginner | Beginner | Initialize a workspace and inspect current status |
| Intermediate | Intermediate | Clone missing repositories and create a feature branch across worktrees |
| Advanced | Advanced | Recover from branch drift and synchronize repositories safely |

## Command Shape by Workflow

- Beginner: `arashi init` -> `arashi status`
- Intermediate: `arashi clone --all` -> `arashi create` -> `arashi switch`
- Advanced: `arashi pull` -> `arashi sync` -> `arashi status`
- Agent inspection/validation: `arashi status` -> `arashi exec -- git status --short` -> `arashi exec --only <repo> -- <validation-command>`

## Selection Guidance

- Start with **Beginner** if this is your first Arashi skill session.
- Choose **Intermediate** if you already have repositories and need cross-repo branch creation.
- Choose **Advanced** if you need sync and recovery controls.
- Use `arashi exec` for repeated non-interactive inspection or validation across managed repositories, especially agent handoff checks.
- For mutating, expensive, network-heavy, or long-running `arashi exec` child commands, use explicit filters such as `--only <repo>` or a narrow comma-separated list instead of relying on the default all-repository selection.
- If you automate teardown on branch removal, use [Hooks](hooks.md).
- If you use tmux/sesh, apply shortcuts from [Session Shortcuts](session-shortcuts.md).
- For the latest hooks docs, see `https://arashi.haphazard.dev/workflows/hooks/`.
- For command defaults and shell-aware switching behavior, see `https://arashi.haphazard.dev/workflows/config/`.
- For VS Code and VS Code-based editor workflows, see `https://arashi.haphazard.dev/workflows/vscode/`.
- For tmux and sesh workflows, see `https://arashi.haphazard.dev/workflows/tmux-and-sesh/`.
- For agent guidance in a meta-repo, see `https://arashi.haphazard.dev/workflows/agents-and-specs/` or fetch the Markdown form at `https://arashi.haphazard.dev/workflows/agents-and-specs.md`.
- For compact agent context across the docs, start with `https://arashi.haphazard.dev/llms.txt`; use `https://arashi.haphazard.dev/llms-full.txt` for a broader Markdown export.

## Workflow Entry Guidance

Assume Arashi is available unless the user is installing it or a command is not working as expected.

When a workflow needs command-specific options, inspect `arashi <command> --help` before recommending or running flags. If your team enforces repository security checks, run them before executing workflows.

When operating as an agent in a meta-repo, start with `arashi status`, identify the owning child repository, keep implementation in `repos/<project>/`, keep shared planning in the meta-repo, and validate each affected repo before handoff. Use `arashi exec -- git status --short` for broad inspection, `arashi exec --dirty -- git diff --stat` for changed repositories, and `arashi exec --only <repo> -- <validation-command>` for targeted validation.

## Beginner Workflow

Run `arashi init` from one of two valid starting points:

- inside an existing repository root you want to manage
- inside a non-repository parent directory, then enter `.` or a child repository name when prompted

```bash
arashi init
arashi status
```

Expected outcomes:

- `.arashi/config.json` exists after `arashi init`.
- `.arashi/config.json` records `worktreesDir` (default `.arashi/worktrees`).
- bootstrap mode accepts `.` for the current directory and a direct child repository name for child-directory creation.
- `.gitignore` includes the configured repositories directory.
- `.gitignore` includes the normalized managed worktree directory entry when using the default location or a safe repository-relative subdirectory.
- `arashi status` prints repository/worktree status without errors.

## Intermediate Workflow

```bash
arashi clone --all
arashi create feature/skill-integration
arashi switch feature/skill-integration
```

Expected outcomes:

- Missing configured repositories are materialized locally.
- New worktrees exist for `feature/skill-integration`.
- `arashi switch` opens the selected worktree in a new terminal context.
- Use `arashi switch --help` to confirm current editor launch flags before choosing an IDE-specific switch option.

## Advanced Workflow

```bash
arashi pull
arashi sync
arashi status
```

Expected outcomes:

- Remotes are fetched and local branches update where possible.
- Sync avoids partial update states.
- `arashi status` reports clean or actionable next steps.

After completion, confirm the expected outcomes listed for that workflow before moving to another one.
