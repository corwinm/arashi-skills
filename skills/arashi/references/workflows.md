# Workflow Catalog

Use this catalog to choose the right workflow by goal and confidence level.

| Workflow | Difficulty | User Goal | Entry Reference |
|----------|------------|-----------|-----------------|
| Beginner | Beginner | Initialize a workspace and inspect current status | `examples/workflow-beginner.md` |
| Intermediate | Intermediate | Add repositories and create a feature branch across worktrees | `examples/workflow-intermediate.md` |
| Advanced | Advanced | Recover from branch drift and synchronize repositories safely | `examples/workflow-advanced.md` |

## Selection Guidance

- Start with **Beginner** if this is your first Arashi skill session.
- Choose **Intermediate** if you already have repositories and need cross-repo branch creation.
- Choose **Advanced** if you need sync and recovery controls.

## Workflow Entry Commands

Before running any workflow:

```bash
bash skills/arashi/scripts/validate.sh --check workflows
```

Then execute commands from the selected example file in order.
