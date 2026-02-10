# Workflow Catalog

Use this catalog to choose the right workflow by goal and confidence level.

| Workflow | Difficulty | User Goal |
|----------|------------|-----------|
| Beginner | Beginner | Initialize a workspace and inspect current status |
| Intermediate | Intermediate | Add repositories and create a feature branch across worktrees |
| Advanced | Advanced | Recover from branch drift and synchronize repositories safely |

## Command Shape by Workflow

- Beginner: `arashi init` -> `arashi status`
- Intermediate: `arashi add` -> `arashi create` -> `arashi list`
- Advanced: `arashi pull` -> `arashi sync` -> `arashi status`

## Selection Guidance

- Start with **Beginner** if this is your first Arashi skill session.
- Choose **Intermediate** if you already have repositories and need cross-repo branch creation.
- Choose **Advanced** if you need sync and recovery controls.
- If you use tmux/sesh, apply shortcuts from `references/session-shortcuts.md`.

## Workflow Entry Commands

Before running any workflow:

```bash
arashi --version
```

## Beginner Workflow

```bash
arashi init
arashi status
```

Expected outcomes:

- `.arashi/config.json` exists after `arashi init`.
- `arashi status` prints repository/worktree status without errors.

## Intermediate Workflow

```bash
arashi add git@github.com:your-org/frontend.git
arashi add git@github.com:your-org/backend.git
arashi create feature/skill-integration
arashi list
```

Expected outcomes:

- Repositories are registered in `.arashi/config.json`.
- New worktrees exist for `feature/skill-integration`.
- `arashi list` shows active worktree paths.

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
