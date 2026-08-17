# Automation and coordinated execution

Run bounded, non-interactive work across repositories and produce machine- or human-readable handoffs.

Installed `arashi <command> --help` is the parameter authority.

## Workflow Execution

Choose one workflow from [Workflows](../workflows.md).

Order of operations:

1. Execute one workflow from start to finish.
2. Confirm expected outcomes from the workflow doc.
3. If a command is missing or behaves unexpectedly, verify setup with `arashi --version` and use [Troubleshooting](../troubleshooting.md).

## JSON Output for Automation

Prefer `--json` when you need to parse Arashi command results for decisions, reports, editor integrations, or follow-up commands. Human-readable output is for users; JSON output is for agents and scripts.

Expected JSON-mode behavior:

- stdout is exactly one JSON document when the command accepts `--json` and reaches command-level execution.
- success envelopes include `ok: true`, `command`, `schemaVersion: 1`, command-specific `data`, and `warnings`.
- command-level failures exit non-zero and include `ok: false`, `command`, `schemaVersion: 1`, `error`, and `warnings`.
- JSON mode does not prompt; missing selections or confirmations return structured errors such as `INTERACTIVE_INPUT_REQUIRED`.
- configured `init`, `pull`, `clone`, `add`, and `create` results include managed-ignore inspection or reconciliation details in their existing envelope, including effective scope, sources, per-path status, planned or applied changes, warnings, unsafe skips, and final changed state.
- `arashi doctor --json` reports managed-ignore problems as stable diagnostic findings rather than repairing them.

Use JSON mode for automation-relevant commands including `add`, `clone`, `create`, `doctor`, `exec`, `handoff`, `init`, `list`, `move`, `prune`, `pull`, `push`, `remove`, `setup`, `status`, `sync`, and `update`.

## Handoff Reports

Use `arashi handoff` when an agent needs to pause, switch with another worker, request review, or leave dirty coordinated work with explicit context.

```bash
RELATED_URL="https://example.com/review"
NEXT_CHECK_COMMAND="arashi status"

# Markdown report for chat, issues, or PR comments
arashi handoff \
  --link "$RELATED_URL" \
  --validation "project validation — passed" \
  --todo "watch CI" \
  --risk "Windows matrix pending" \
  --next-command "$NEXT_CHECK_COMMAND"

# Parseable report for another agent or script
arashi handoff --json --link "$RELATED_URL"
```

Expected outcomes:

- Markdown mode includes workspace path/branch, current repository context, per-repository status, dirty or error repositories needing attention, related links, validation evidence, todos, risks, and next commands.
- Markdown is the default; omit the deprecated compatibility spelling `--markdown` from preferred commands.
- JSON mode emits one envelope with `command: "handoff"`, workspace metadata, per-repository status records, supplied context arrays, warnings, and generated next-command hints.
- `arashi handoff` is read-only: it does not run validation commands, stage files, commit, push, delete worktrees, or write report files by default.
- Only pass `--validation` entries for commands that actually ran; put pending or unverified checks in `--todo` or `--risk`.

## Repository Group Filters

Workspaces can declare semantic repository sets with `repos.<name>.groups` arrays in `.arashi/config.json`:

```json
{
  "repos": {
    "arashi": { "path": "repos/arashi", "groups": ["core"] },
    "arashi-docs": { "path": "repos/arashi-docs", "groups": ["docs"] },
    "arashi-vscode": {
      "path": "repos/arashi-vscode",
      "groups": ["extensions"]
    },
    "arashi-skills": {
      "path": "repos/arashi-skills",
      "groups": ["agents", "docs"]
    },
    "deploy": { "path": "repos/deploy", "groups": ["infra"] }
  }
}
```

Common group names include `core`, `docs`, `extensions`, `agents`, and `infra`. Use `--group <group>` on repo-selecting commands when a known semantic set matches the task better than enumerating repositories with `--only`.

Repository selectors accept repeated occurrences, comma-separated values, or both. Shared normalization preserves encounter order, trims whitespace, ignores blank segments beside valid values, and deduplicates by first occurrence. Explicitly supplied selectors that normalize to empty, unknown values, and valid filters with no matches fail closed before repository discovery or mutation. `--only` and `--group` intersect; an empty intersection is an error rather than an empty successful run. `status --only` is configured-workspace-only, includes the established parent report while limiting child inspection, and is rejected in standalone mode along with `status --group`.

Examples:

```bash
arashi status --group docs
arashi create feat/docs-refresh --group docs --no-launch --no-switch
arashi exec --group docs -- bun run validate
arashi pull --group infra --json
arashi setup --group extensions
arashi sync --group agents
arashi push --group core --set-upstream --dry-run
```

`--group` composes with `--only` by intersection. If both are supplied, a repository must match the explicit name filter and belong to at least one requested group. For example, `arashi exec --only arashi,arashi-docs --group docs -- bun run validate` runs only in `arashi-docs` when `arashi-docs` is the only named repository in the `docs` group. Unknown groups and valid filters that produce an empty intersection are reported as selection errors before mutating commands run.

Unsupported launch, shell-code, or interactive modes return a structured error instead of mixing human output into JSON:

```json
{
  "ok": false,
  "command": "switch",
  "schemaVersion": 1,
  "error": {
    "code": "JSON_UNSUPPORTED_FOR_MODE",
    "message": "JSON output is not supported for this mode",
    "details": {
      "mode": "launch"
    }
  },
  "warnings": []
}
```

When `error.code` is `JSON_UNSUPPORTED_FOR_MODE`, retry with a non-launching or non-interactive mode if available. Otherwise run without `--json` only when the user wants the human-facing action, such as opening an editor, changing a shell, or emitting shell integration code.

## Publishing Coordinated Branches

Use `arashi push` after committing implementation changes and before opening cross-repo PRs.

```bash
# preview first when publishing a new coordinated branch
arashi push --set-upstream --dry-run

# publish eligible changed repositories and set upstreams where needed
arashi push --set-upstream

# publish only one affected child repo
arashi push --only arashi-docs --set-upstream

# publish changed docs repositories only
arashi push --group docs --set-upstream

# parse push results in automation
arashi push --set-upstream --json
```

Expected outcomes:

- changed repositories with publishable local branch commits are pushed
- clean or intentionally untouched child repositories are skipped with reasons
- `--dry-run` previews without mutating remotes
- `--json` emits one envelope with per-repository results, totals, and warnings for skipped repositories
## Multi-Repository Command Execution

Use `arashi exec` when you need to run the same non-interactive inspection or validation command from each selected managed repository. Put the child command after `--`; Arashi options must come before that delimiter, and child command options must come after it.

```bash
# inspect working-tree changes across selected managed repositories
arashi exec -- git status --short

# inspect only repositories with local changes
arashi exec --dirty -- git diff --stat

# validate one known repository with structured output for agents/scripts
arashi exec --only arashi-docs --json -- bun run validate

# validate a known semantic group
arashi exec --group docs -- bun run validate

# run tests with bounded concurrency and stop scheduling new repos after a failure
arashi exec --only arashi,arashi-docs --jobs 2 --fail-fast -- bun run test

# pass flags to the child command after the delimiter
arashi exec --only arashi -- bun run test -- --watch=false
```

Safety guidance for agents:

- Prefer `arashi exec` for repeated multi-repo validation and inspection (`git status --short`, `git diff --stat`, `bun run test`, `bun run lint`, docs validation).
- Use explicit filters for mutating, expensive, network-heavy, or long-running commands. Prefer `--group <group>` for known semantic sets and `--only <repo>` or a narrow comma-separated list for one-off selections. Do not fan out those commands to every managed repository unless the user asked for all repositories.
- Remember that `--group` intersects with `--only` and narrows the explicit repository list when both are supplied.
- Use `--dirty` when the command should inspect only repositories with local changes.
- Keep execution serial by default. Add `--jobs <n>` only when the command is safe to run concurrently and shared resources such as package-manager caches, ports, databases, or generated artifacts will not conflict.
- Add `--fail-fast` for expensive validation when later repository runs are not useful after the first failure. Already-running jobs may still finish when combined with `--jobs`.
- Prefer `--json` when an agent or script needs to parse per-repository stdout, stderr, child exit status, duration, selected repositories, or aggregate totals. Any child command failure makes the `arashi exec` process exit non-zero.

Expected outcomes:

- each child command runs with the selected repository path as its working directory
- human output is grouped by repository and ends with an aggregate summary
- `--only` errors for requested repositories that are not configured or locally present
- `--dirty` exits successfully without running the child command when no dirty repositories match
- invalid options, missing child command arguments, and invalid `--jobs` values fail before repository commands execute
