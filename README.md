# Arashi Skill

Install the Arashi skill for coding agents with [`skills`](https://skills.sh/corwinm/arashi-skills/arashi):

```bash
npx skills add https://github.com/corwinm/arashi-skills --skill arashi
```

The skill helps agents use [Arashi](https://github.com/corwinm/arashi) safely across single repositories and coordinated meta-repositories. It provides task routing, workflow guidance, command references, and troubleshooting for common worktree operations.

## Before you start

The Arashi CLI is installed separately. Follow the [getting-started guide](https://arashi.haphazard.dev/getting-started/), then verify it with:

```bash
aw --version
```

Use `aw --help` and `aw <command> --help` for current command options. The `arashi` executable remains available for existing scripts and workflows.

## What the skill covers

- Installing, updating, and diagnosing Arashi
- Configured and standalone workspace setup
- Creating, switching, moving, and removing worktrees
- Coordinated status, execution, pull, push, and sync workflows
- Editor, terminal, hook, and shell integration
- Safe recovery and troubleshooting

Start with [`skills/arashi/SKILL.md`](./skills/arashi/SKILL.md). Its [package index](./skills/arashi/README.md) routes to focused references, tutorials, workflows, and troubleshooting without loading the entire guide at once.

## Documentation

- [Arashi documentation](https://arashi.haphazard.dev/)
- [Workflow guides](https://arashi.haphazard.dev/workflows/)
- [Command reference](https://arashi.haphazard.dev/commands/)
- [Agent-readable documentation](https://arashi.haphazard.dev/llms.txt)

## Contributing

Keep detailed operational guidance inside `skills/arashi/` and keep repository-level validation policy outside the installed skill. Before submitting changes, run:

```bash
node scripts/validate-guidance.mjs
node scripts/security-gate.mjs --root . --exceptions security/audit-exceptions.json
node scripts/create-release-archive.mjs --output arashi-skill-package.tar.gz
```

See the [maintainer publication policy](https://github.com/corwinm/arashi-skills/blob/main/docs/publication.md) and [security policy](./security/policy.md) for the complete release and compliance process.

## Related repositories

- [Arashi CLI](https://github.com/corwinm/arashi)
- [Arashi specifications and planning](https://github.com/corwinm/arashi-arashi)
